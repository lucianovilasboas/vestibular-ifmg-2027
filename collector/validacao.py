"""
Módulo de validação de coleta (scraper_v4 + processa_v2).

Evita contaminar o histórico com dados corrompidos/distorcidos:
- Erros GRAVES -> quarentena (não entra no histórico)
- Avisos      -> loga, mas segue o processamento
"""

import os
import shutil
import pandas as pd
from datetime import datetime
from log import logger

# Limites de sanidade
MAX_INSCRICOES_TOTAL = 100000      # por modalidade, numa coleta
MAX_INSCRICOES_CURSO = 20000       # por curso, numa coleta
LIMITE_SALTO_COLETA = 0.50         # variação aceitável vs última coleta (50%)

COLUNAS_OBRIGATORIAS_CURSOS = ['Unidade', 'Curso', 'Vagas', 'Inscritos']
COLUNAS_OBRIGATORIAS_ESCOLAS = ['Campus', 'Escola', 'Cidade', 'Inscritos']
COLUNAS_OBRIGATORIAS_RESUMO = ['Campus', 'Categoria', 'Label', 'Valor']
COLUNAS_OBRIGATORIAS_CARDS = ['Modalidade', 'Inscricoes']

QUARENTENA_FOLDER = "./dados/quarentena"


class ResultadoValidacao:
    """Agrega erros (bloqueiam) e avisos (não bloqueiam) de uma validação."""

    def __init__(self):
        self.erros = []
        self.avisos = []

    @property
    def valido(self):
        return len(self.erros) == 0

    def adicionar_erro(self, msg):
        self.erros.append(msg)

    def adicionar_aviso(self, msg):
        self.avisos.append(msg)

    def log(self, contexto=""):
        prefixo = f"[validacao] {contexto}: " if contexto else "[validacao] "
        for msg in self.erros:
            logger.error(f"{prefixo}ERRO - {msg}")
        for msg in self.avisos:
            logger.warning(f"{prefixo}AVISO - {msg}")


def _tem_colunas(df, colunas):
    return [c for c in colunas if c not in df.columns]


def validar_cursos(df, modalidade=""):
    """Valida um arquivo dados_{MOD}_{ts}.csv."""
    r = ResultadoValidacao()
    if df is None or df.empty:
        r.adicionar_erro("arquivo vazio")
        return r

    faltando = _tem_colunas(df, COLUNAS_OBRIGATORIAS_CURSOS)
    if faltando:
        r.adicionar_erro(f"colunas obrigatórias ausentes: {faltando}")
        return r

    # Campos de texto obrigatórios
    vazios = df[df['Unidade'].astype(str).str.strip() == '']
    if len(vazios) > 0:
        r.adicionar_erro(f"{len(vazios)} linhas com Unidade vazia")

    vazios_curso = df[df['Curso'].astype(str).str.strip() == '']
    if len(vazios_curso) > 0:
        r.adicionar_erro(f"{len(vazios_curso)} linhas com Curso vazia")

    # Valores negativos
    negativos = df[(df['Inscritos'] < 0) | (df['Vagas'] < 0)]
    if len(negativos) > 0:
        r.adicionar_erro(f"{len(negativos)} linhas com Inscritos/Vagas negativos")

    # Valores absurdos
    if df['Inscritos'].max() > MAX_INSCRICOES_CURSO:
        r.adicionar_erro(f"curso com {df['Inscritos'].max()} inscritos (limite {MAX_INSCRICOES_CURSO})")

    if 'Homologados' in df.columns and (df['Homologados'] < 0).any():
        r.adicionar_erro("Homologados negativos encontrados")

    # Duplicatas dentro da mesma coleta (Unidade+Curso)
    dup = df[df.duplicated(subset=['Unidade', 'Curso'], keep=False)]
    if len(dup) > 0:
        r.adicionar_erro(f"{len(dup)} linhas duplicadas (Unidade+Curso) dentro da coleta")

    # Soma de inscritos dentro de limite
    total = df['Inscritos'].sum()
    if total > MAX_INSCRICOES_TOTAL:
        r.adicionar_erro(f"total de {total} inscritos excede limite ({MAX_INSCRICOES_TOTAL})")

    # Avisos
    if 'Vagas' in df.columns and (df['Vagas'] == 0).sum() > 0:
        r.adicionar_aviso(f"{(df['Vagas'] == 0).sum()} cursos com Vagas=0 (dados novos deveriam ter vagas)")

    if df['Inscritos'].isna().any():
        r.adicionar_aviso("células com Inscritos ausente (NaN)")

    return r


def validar_escolas(df, modalidade=""):
    """Valida um arquivo escolas_{MOD}_{ts}.csv."""
    r = ResultadoValidacao()
    if df is None or df.empty:
        r.adicionar_erro("arquivo vazio")
        return r

    faltando = _tem_colunas(df, COLUNAS_OBRIGATORIAS_ESCOLAS)
    if faltando:
        r.adicionar_erro(f"colunas obrigatórias ausentes: {faltando}")
        return r

    if (df['Inscritos'] < 0).any():
        r.adicionar_erro("escolas com Inscritos negativos")

    vazias = df[df['Escola'].astype(str).str.strip() == '']
    if len(vazias) > 0:
        r.adicionar_erro(f"{len(vazias)} linhas com Escola vazia")

    dup = df[df.duplicated(subset=['Campus', 'Escola'], keep=False)]
    if len(dup) > 0:
        r.adicionar_erro(f"{len(dup)} escolas duplicadas dentro da coleta")

    if df['Escola'].astype(str).str.contains(r'\?', na=False).any():
        r.adicionar_aviso("nomes de escola com '?' (encoding quebrado)")

    return r


def validar_escolas_resumo(df, modalidade=""):
    """Valida um arquivo escolas_resumo_{MOD}_{ts}.csv."""
    r = ResultadoValidacao()
    if df is None or df.empty:
        r.adicionar_erro("arquivo vazio")
        return r

    faltando = _tem_colunas(df, COLUNAS_OBRIGATORIAS_RESUMO)
    if faltando:
        r.adicionar_erro(f"colunas obrigatórias ausentes: {faltando}")
        return r

    if (df['Valor'] < 0).any():
        r.adicionar_erro("resumo com valores negativos")

    categorias_validas = {'tipo', 'area', 'cidade'}
    categorias = set(df['Categoria'].astype(str).unique())
    if not categorias.issubset(categorias_validas):
        r.adicionar_erro(f"categorias inválidas: {categorias - categorias_validas}")

    return r


def validar_cards(df, modalidade=""):
    """Valida um arquivo cards_{ts}.csv."""
    r = ResultadoValidacao()
    if df is None or df.empty:
        r.adicionar_erro("arquivo vazio")
        return r

    faltando = _tem_colunas(df, COLUNAS_OBRIGATORIAS_CARDS)
    if faltando:
        r.adicionar_erro(f"colunas obrigatórias ausentes: {faltando}")
        return r

    if (df['Inscricoes'] < 0).any():
        r.adicionar_erro("cards com Inscricoes negativas")

    if (df['Inscricoes'] > MAX_INSCRICOES_TOTAL).any():
        r.adicionar_erro("cards com Inscricoes acima do limite")

    return r


def validar_salto_total(historico, novo_total, modalidade):
    """
    Compara o total de inscritos da nova coleta com a última coleta histórica
    da mesma modalidade. Variação acima do limite é tratada como aviso (não bloqueia,
    pois booms reais acontecem; mas é sinalizado para revisão).
    """
    r = ResultadoValidacao()
    if historico is None or historico.empty:
        return r
    df_h = historico[historico['Modalidade'] == modalidade].copy()
    if df_h.empty:
        return r
    # O histórico tem coluna 'Timestamp' (processa_v2) — converte para datetime
    col_dt = 'Data' if 'Data' in df_h.columns else 'Timestamp'
    df_h[col_dt] = pd.to_datetime(df_h[col_dt])
    ultima = df_h[col_dt].max()
    anterior = df_h[df_h[col_dt] == ultima]['Inscritos'].sum()
    if anterior == 0:
        return r
    variacao = (novo_total - anterior) / anterior
    if abs(variacao) > LIMITE_SALTO_COLETA:
        r.adicionar_aviso(
            f"{modalidade}: variação de {variacao:+.1%} vs última coleta "
            f"({int(anterior)} -> {int(novo_total)}), limite {LIMITE_SALTO_COLETA:+.0%}"
        )
    return r


MODALIDADES_ESPERADAS = {'INT', 'SUB', 'SUP'}


def validar_completude_coleta(coletas_novas, historico=None):
    """
    Verifica se cada coleta nova (timestamp) contém todas as modalidades esperadas.
    Coletas incompletas distorcem os gráficos de evolução (total "cai" sem motivo).

    Retorna um ResultadoValidacao com avisos/erros por timestamp.
    """
    r = ResultadoValidacao()
    if coletas_novas is None or coletas_novas.empty:
        return r

    for ts, grupo in coletas_novas.groupby('Timestamp'):
        modalidades = set(grupo['Modalidade'].unique())
        faltando = MODALIDADES_ESPERADAS - modalidades
        if faltando:
            r.adicionar_erro(
                f"coleta {ts} incompleta: faltam modalidades {sorted(faltando)} "
                f"(presentes: {sorted(modalidades)})"
            )
    return r


def mover_para_quarentena(file_path, motivo):
    """Move um arquivo suspeito para a pasta de quarentena."""
    os.makedirs(QUARENTENA_FOLDER, exist_ok=True)
    destino = os.path.join(QUARENTENA_FOLDER, os.path.basename(file_path))
    if os.path.exists(destino):
        destino = os.path.join(
            QUARENTENA_FOLDER,
            f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{os.path.basename(file_path)}",
        )
    shutil.move(file_path, destino)
    logger.error(f"[quarentena] {os.path.basename(file_path)} movido para quarentena ({motivo})")
    return destino
