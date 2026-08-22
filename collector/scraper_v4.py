#!/usr/bin/env python3
"""
Scraper v4 - Novo layout FCM (2027/1)
- Login normal (username/password) via /login
- Para cada modalidade (INT/SUB/SUP):
    * Troca o processo ativo via /processoseletivo/{CODIGO}/session
    * Painel de Controle (/paineldecontrole): cards KPI (Inscrições, Pagas, Isenção...)
    * Painel Inscrições por Curso (/painelinscricoescursos): array JS 'dadosTabelaInscricoes'
        com vagas, inscritos e homologados por opção + reservas de vagas (cotas LB_*/LI_*/AC)
    * Painel Inscrições por Escola (/painelinscricoesescolas): Top 30 escolas + resumos
        por tipo, área e cidade (donuts Morris)
- Salva CSVs em dados/input/: dados_{MOD}_{ts}.csv, escolas_{MOD}_{ts}.csv,
  escolas_resumo_{MOD}_{ts}.csv e cards_{ts}.csv
"""

import requests
import pandas as pd
import os
import re
import shutil
import sys
import time
from datetime import datetime
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import logging
from dotenv import load_dotenv
from validacao import validar_cursos, validar_escolas, validar_escolas_resumo, validar_cards, mover_para_quarentena
from relatorio import log_relatorio, abrir_bloco, fechar_bloco

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

requests.packages.urllib3.disable_warnings()

load_dotenv()  # carrega credenciais do arquivo .env (uso local)

BASE_URL = "https://fundacao.cefetmg.br"
LOGIN_URL = f"{BASE_URL}/login"
USERNAME = os.getenv("FCM_USERNAME")
PASSWORD = os.getenv("FCM_PASSWORD")

if not USERNAME or not PASSWORD:
    logger.error("Credenciais não encontradas. Verifique o arquivo .env (FCM_USERNAME e FCM_PASSWORD).")
    raise SystemExit("Faltam credenciais no arquivo .env")

PROCESSOS = {
    "INT": "IFMGTI271",
    "SUB": "IFMGTS271",
    "SUP": "IFMGGR271",
}

# Retry e segurança da coleta (configuráveis por env)
MAX_TENTATIVAS = int(os.getenv("FCM_MAX_TENTATIVAS", "3"))
AGUARDO_RETRY = int(os.getenv("FCM_AGUARDO_RETRY", "30"))

DOWNLOAD_DIR = "./dados/input"
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

COTAS = ["LB_PPI", "LB_Q", "LB_PCD", "LB_EP", "LI_PPI", "LI_Q", "LI_PCD", "LI_EP", "AC"]

# Códigos das unidades usados no painel de escolas (/painelinscricoesescolas/{CODIGO})
# A chave "TOD" representa "todas as unidades" (página sem código)
UNIDADES_ESCOLAS = {
    "TOD": "Todas as unidades",
    "ARC": "Arcos",
    "BAM": "Bambuí",
    "BET": "Betim",
    "CON": "Congonhas",
    "LAF": "Conselheiro Lafaiete",
    "FOR": "Formiga",
    "GVA": "Governador Valadares",
    "IBI": "Ibirité",
    "IPA": "Ipatinga",
    "ITA": "Itabirito",
    "OBR": "Ouro Branco",
    "OPR": "Ouro Preto",
    "PIU": "Piumhi",
    "PNV": "Ponte Nova",
    "RNV": "Ribeirão das Neves",
    "SAB": "Sabará",
    "SLZ": "Santa Luzia",
    "SJE": "São João Evangelista",
}

# Correções de acentos perdidos pelo site (serve HTML em latin-1 com "?" no lugar de acentos)
CORRECOES_ACENTO = {
    "P?blica": "Pública",
    "P?blico": "Público",
    "P?blicos": "Públicos",
    "N?O": "NÃO",
    "N?o": "Não",
    "N?": "N?",
    "PA?SES": "PAÍSES",
    "PA?S": "PAÍS",
    "A?O": "ÃO",
    "T?C": "TÉC",
}


def normalizar_texto(s):
    """Colapsa espaços e tenta corrigir acentos perdidos (encoding do site)."""
    s = re.sub(r'\s+', ' ', str(s)).strip()
    for k, v in CORRECOES_ACENTO.items():
        s = s.replace(k, v)
    return s


def create_driver():
    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--remote-debugging-port=9222")
    # Caminhos explícitos do chromium/chromedriver instalados via apt.
    # Evita o Selenium Manager, que não suporta linux/aarch64 (VPS ARM).
    options.binary_location = shutil.which("chromium") or "/usr/bin/chromium"
    service = Service(executable_path=shutil.which("chromedriver") or "/usr/bin/chromedriver")
    driver = webdriver.Chrome(service=service, options=options)
    driver.set_page_load_timeout(60)
    return driver


def do_login(driver):
    """Faz login uma única vez no painel."""
    logger.info("Fazendo login...")
    driver.get(LOGIN_URL)
    time.sleep(3)

    wait = WebDriverWait(driver, 30)
    username_input = wait.until(EC.presence_of_element_located((By.NAME, "username")))
    username_input.send_keys(USERNAME)
    driver.find_element(By.NAME, "password").send_keys(PASSWORD)
    wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button.btn.bg-blue.btn-block"))).click()
    wait.until(EC.url_contains("paineldecontrole"))
    logger.info("Login realizado, painel carregado")
    time.sleep(2)

    session = requests.Session()
    session.verify = False
    for cookie in driver.get_cookies():
        session.cookies.set(cookie['name'], cookie['value'])

    return session


def select_processo(driver, session, modalidade):
    """Seleciona o processo (modalidade) e mantém cookies na session."""
    logger.info(f"Selecionando processo {modalidade} ({PROCESSOS[modalidade]})...")
    driver.get(f"{BASE_URL}/processoseletivo/{PROCESSOS[modalidade]}/session")
    time.sleep(3)

    for cookie in driver.get_cookies():
        session.cookies.set(cookie['name'], cookie['value'])

    return session


def fetch_painel_cursos(driver):
    """Extrai o array 'dadosTabelaInscricoes' do painel Inscrições por Curso."""
    logger.info("Acessando Painel de Inscrições por Curso...")
    driver.get(f"{BASE_URL}/painelinscricoescursos")
    time.sleep(3)

    dados = driver.execute_script("return typeof dadosTabelaInscricoes !== 'undefined' ? dadosTabelaInscricoes : null;")
    if not dados:
        logger.warning("Array dadosTabelaInscricoes não encontrado na página.")
        return None

    rows = []
    for c in dados:
        op1 = c.get('opcoes', {}).get('1') or {}
        row = {
            'Unidade': normalizar_texto(c.get('unidade', '')),
            'Curso': normalizar_texto(c.get('curso', '')),
            'Vagas': int(c.get('vagas', 0) or 0),
            'Inscritos': int(op1.get('inscritos', 0) or 0),
            'Homologados': int(op1.get('validos', 0) or 0),
        }
        for cota in COTAS:
            row[cota] = int(op1.get(cota, 0) or 0)
        rows.append(row)

    df = pd.DataFrame(rows)
    if df.empty:
        return None

    df['Inscr./Vagas'] = df.apply(
        lambda r: round(r['Inscritos'] / r['Vagas'], 2) if r['Vagas'] > 0 else 0, axis=1
    )
    df['Homolog./Vagas'] = df.apply(
        lambda r: round(r['Homologados'] / r['Vagas'], 2) if r['Vagas'] > 0 else 0, axis=1
    )

    logger.info(f"  Painel de Cursos: {len(df)} linhas, {df['Inscritos'].sum()} inscritos (opção 1)")
    return df


def parse_painel_escolas_html(html):
    """Extrai Top 30 (tabela) e donuts (tipo/área/cidade) do HTML server-side."""
    soup = BeautifulSoup(html, "html.parser")

    # --- Tabela Top 30 escolas ---
    escolas = []
    for tr in soup.select("table tbody tr"):
        cells = [td.get_text(" ", strip=True) for td in tr.find_all("td")]
        if len(cells) >= 6:
            escolas.append({
                'Rank': int(cells[0]) if cells[0].isdigit() else None,
                'Escola': normalizar_texto(cells[1]),
                'Cidade': normalizar_texto(cells[2]),
                'Tipo': normalizar_texto(cells[3]),
                'Area': normalizar_texto(cells[4]),
                'Inscritos': int(re.sub(r'\D', '', cells[5]) or 0),
            })

    # --- Donuts (tipo / área / cidade) ---
    resumo = {'tipo': [], 'area': [], 'cidade': []}
    for script in soup.find_all("script"):
        text = script.string or ""
        if 'Morris.Donut' not in text:
            continue
        blocos = re.findall(r"Morris\.Donut\(\{(.*?)\}\s*\)", text, re.DOTALL)
        for bloco in blocos:
            elem_match = re.search(r"element:\s*'(grafico-inscricoes-[^']+)'", bloco)
            if not elem_match:
                continue
            qual = 'cidade' if 'cidade' in elem_match.group(1) else ('area' if 'area' in elem_match.group(1) else 'tipo')
            pares = re.findall(r'label:\s*"([^"]+)",\s*\n?\s*value:\s*(\d+)', bloco)
            for label, valor in pares:
                resumo[qual].append({'Label': normalizar_texto(label), 'Valor': int(valor)})

    return escolas, resumo


def fetch_painel_escolas(session, unidade_codigo="TOD"):
    """Extrai Top 30 escolas e donuts para uma unidade via requests (HTML server-side).

    unidade_codigo: código da unidade (ARC, BAM...) ou "TOD" para todas as unidades.
    """
    if unidade_codigo == "TOD":
        url = f"{BASE_URL}/painelinscricoesescolas"
        nome = "Todas as unidades"
    else:
        url = f"{BASE_URL}/painelinscricoesescolas/{unidade_codigo}"
        nome = UNIDADES_ESCOLAS.get(unidade_codigo, unidade_codigo)

    resp = session.get(url, timeout=30)
    resp.raise_for_status()
    escolas, resumo = parse_painel_escolas_html(resp.text)
    logger.info(f"  Escolas {nome}: {len(escolas)} escolas, "
                f"{sum(len(v) for v in resumo.values())} linhas de resumo")
    return escolas, resumo


def fetch_painel_cards(driver):
    """Extrai os cards do painel de controle."""
    logger.info("Acessando Painel de Controle (cards)...")
    driver.get(f"{BASE_URL}/paineldecontrole")
    time.sleep(3)

    html = driver.find_element(By.TAG_NAME, "body").get_attribute("innerHTML")
    boxes = re.findall(
        r'<div class="small-box (?:bg-\w+)">.*?<h3>\s*([\d.]+)\s*</h3>.*?<p>\s*([^<]+)\s*</p>',
        html, re.DOTALL
    )
    cards = {}
    for num, label in boxes:
        label_clean = normalizar_texto(label)
        try:
            cards[label_clean] = int(num.replace('.', ''))
        except ValueError:
            cards[label_clean] = num.strip()
    return cards


def save_painel_cursos(df, modalidade, coleta_ts):
    """Salva dados_{MOD}_{ts}.csv (uma linha por curso, opção 1)."""
    timestamp = coleta_ts.strftime("%Y%m%d_%H%M")
    df = df.copy()
    df['Timestamp'] = coleta_ts
    df['Modalidade'] = modalidade

    cols = (['Unidade', 'Curso', 'Vagas', 'Inscritos', 'Homologados',
             'Inscr./Vagas', 'Homolog./Vagas'] + COTAS +
            ['Timestamp', 'Modalidade'])
    filepath = os.path.join(DOWNLOAD_DIR, f"dados_{modalidade}_{timestamp}.csv")
    df[cols].to_csv(filepath, index=False, encoding="utf-8")
    logger.info(f"  Salvo: {filepath} ({len(df)} cursos)")
    return filepath


def save_painel_escolas(escolas_por_campus, resumo_por_campus, modalidade, coleta_ts):
    """Salva escolas_{MOD}_{ts}.csv e escolas_resumo_{MOD}_{ts}.csv com coluna Campus."""
    timestamp = coleta_ts.strftime("%Y%m%d_%H%M")
    ts = coleta_ts

    linhas_escolas = []
    for campus, escolas in escolas_por_campus.items():
        for e in escolas:
            linhas_escolas.append({
                'Rank': e.get('Rank'),
                'Campus': campus,
                'Escola': e['Escola'],
                'Cidade': e['Cidade'],
                'Tipo': e['Tipo'],
                'Area': e['Area'],
                'Inscritos': e['Inscritos'],
                'Timestamp': ts,
                'Modalidade': modalidade,
            })
    df_escolas = pd.DataFrame(linhas_escolas)
    path_escolas = None
    if not df_escolas.empty:
        path_escolas = os.path.join(DOWNLOAD_DIR, f"escolas_{modalidade}_{timestamp}.csv")
        df_escolas[['Rank', 'Campus', 'Escola', 'Cidade', 'Tipo', 'Area', 'Inscritos', 'Timestamp', 'Modalidade']].to_csv(
            path_escolas, index=False, encoding="utf-8")
        logger.info(f"  Salvo: {path_escolas} ({len(df_escolas)} linhas)")

    linhas_resumo = []
    for campus, resumo in resumo_por_campus.items():
        for categoria, itens in resumo.items():
            for item in itens:
                linhas_resumo.append({
                    'Campus': campus,
                    'Categoria': categoria,
                    'Label': item['Label'],
                    'Valor': item['Valor'],
                    'Timestamp': ts,
                    'Modalidade': modalidade,
                })
    df_resumo = pd.DataFrame(linhas_resumo)
    path_resumo = None
    if not df_resumo.empty:
        path_resumo = os.path.join(DOWNLOAD_DIR, f"escolas_resumo_{modalidade}_{timestamp}.csv")
        df_resumo.to_csv(path_resumo, index=False, encoding="utf-8")
        logger.info(f"  Salvo: {path_resumo} ({len(df_resumo)} linhas)")

    return path_escolas, path_resumo


def save_cards(cards_por_modalidade, coleta_ts):
    """Salva cards_{ts}.csv a partir dos cards do painel de controle."""
    timestamp = coleta_ts.strftime("%Y%m%d_%H%M")
    rows = []
    for modalidade, cards in cards_por_modalidade.items():
        rows.append({
            'Modalidade': modalidade,
            'Inscricoes': cards.get('Inscrições', 0),
            'InscricoesPagas': cards.get('Inscrições Pagas', 0),
            'Isencao': cards.get('Solic. de Isenção', 0),
            'IsencaoDeferidas': cards.get('Solic. De Isenção Deferidas', 0),
            'CondicoesEspeciais': cards.get('Solic. de Condições Especiais', 0),
            'CondicoesDeferidas': cards.get('Solic. de Condições Especiais Deferidas', 0),
        })
    df_cards = pd.DataFrame(rows)
    filepath = os.path.join(DOWNLOAD_DIR, f"cards_{timestamp}.csv")
    df_cards.to_csv(filepath, index=False, encoding="utf-8")
    logger.info(f"Cards salvos: {filepath}")
    return filepath


def fetch_painel_cursos_retry(driver, tentativas=2, espera=10):
    """Busca o painel de cursos com re-navegação em caso de falha (o array às vezes não carrega)."""
    for i in range(tentativas):
        try:
            df = fetch_painel_cursos(driver)
            if df is not None and not df.empty:
                return df
        except Exception as e:
            logger.error(f"  fetch_painel_cursos erro (tentativa {i + 1}): {e}")
        if i < tentativas - 1:
            logger.warning(f"  Painel de cursos não carregou (tentativa {i + 1}/{tentativas}); re-navegando...")
            time.sleep(espera)
    return None


def coletar_escolas(session, tentativas=2):
    """Coleta escolas (Top 30 + resumo) de todas as unidades, com retry por campus."""
    escolas_por_campus = {}
    resumo_por_campus = {}
    for codigo in UNIDADES_ESCOLAS:
        nome = UNIDADES_ESCOLAS[codigo]
        ok = False
        for t in range(tentativas):
            try:
                escolas, resumo = fetch_painel_escolas(session, codigo)
                escolas_por_campus[nome] = escolas
                resumo_por_campus[nome] = resumo
                ok = True
                break
            except Exception as e:
                logger.error(f"Erro ao buscar escolas de {codigo} (tentativa {t + 1}/{tentativas}): {e}")
                time.sleep(3)
        if not ok:
            escolas_por_campus[nome] = []
            resumo_por_campus[nome] = {'tipo': [], 'area': [], 'cidade': []}
            logger.warning(f"Escolas de {nome} indisponíveis após {tentativas} tentativas.")
        time.sleep(0.5)  # gentileza com o servidor
    return escolas_por_campus, resumo_por_campus


def coletar_modalidade(driver, session, modalidade):
    """Coleta uma modalidade completa (cursos + escolas + cards). Retorna dict ou None se falhar."""
    logger.info(f"\n--- {modalidade} ---")
    try:
        session = select_processo(driver, session, modalidade)
        df_cursos = fetch_painel_cursos_retry(driver)
        if df_cursos is None or df_cursos.empty:
            logger.error(f"Cursos de {modalidade} falharam após as tentativas.")
            return None
        resultado = validar_cursos(df_cursos, modalidade)
        resultado.log(contexto=f"scraper {modalidade}")

        logger.info("Coletando escolas por unidade (todas + campi)...")
        escolas_por_campus, resumo_por_campus = coletar_escolas(session)

        try:
            cards = fetch_painel_cards(driver)
            logger.info(f"  Cards {modalidade}: {cards}")
        except Exception as e:
            logger.error(f"Erro ao buscar cards para {modalidade}: {e}")
            cards = None

        return {
            "df_cursos": df_cursos,
            "escolas_por_campus": escolas_por_campus,
            "resumo_por_campus": resumo_por_campus,
            "cards": cards,
        }
    except Exception as e:
        logger.error(f"Falha na coleta de {modalidade}: {e}")
        return None


def limpar_arquivos_parciais(coleta_ts):
    """Move para quarentena os arquivos parciais de uma coleta abortada (input/)."""
    ts = coleta_ts.strftime("%Y%m%d_%H%M")
    for f in os.listdir(DOWNLOAD_DIR):
        if f.endswith('.csv') and f'_{ts}.csv' in f:
            origem = os.path.join(DOWNLOAD_DIR, f)
            try:
                mover_para_quarentena(origem, "coleta incompleta (abortada no scraper)")
            except Exception as e:
                logger.error(f"Erro ao mover {f} para quarentena: {e}")


def emitir_relatorio(relatorio):
    """Escreve o bloco de relatório da coleta no logs/relatorio_coleta.log."""
    abrir_bloco()
    log_relatorio(f"Data: {relatorio['inicio'].strftime('%d-%m-%Y %H:%M:%S')} → "
                  f"{relatorio['fim'].strftime('%d-%m-%Y %H:%M:%S')}")
    log_relatorio(f"Status: {relatorio['status']}")
    if relatorio.get("motivo"):
        log_relatorio(f"Motivo: {relatorio['motivo']}")
    for mod in ["INT", "SUB", "SUP"]:
        info = relatorio.get("modalidades", {}).get(mod)
        if not info:
            continue
        if info["status"] == "ok":
            extra = (f"cursos={info.get('cursos', '-')}  escolas={info.get('escolas', '-')}  "
                     f"cards={info.get('cards', '-')}")
            log_relatorio(f"  {mod}  OK   ({info['tentativas']} tentativa(s))  {extra}")
        else:
            log_relatorio(f"  {mod}  FALHA ({info['tentativas']} tentativa(s))  motivo: {info.get('motivo', '')}")
    log_relatorio(relatorio.get("acao", ""))
    fechar_bloco()


def main():
    logger.info("=== Scraper v4 - Novo Layout (cursos + escolas por campus + cards) ===")
    relatorio = {
        "inicio": datetime.now(),
        "fim": datetime.now(),
        "status": "ABORTADA",
        "motivo": "erro inesperado",
        "modalidades": {},
        "acao": "",
    }
    driver = create_driver()
    try:
        session = do_login(driver)
        coleta_ts = datetime.now()

        dados = {}
        falhas = []

        for modalidade in PROCESSOS:
            ok = False
            for tentativa in range(1, MAX_TENTATIVAS + 1):
                resultado = coletar_modalidade(driver, session, modalidade)
                if resultado is not None:
                    dados[modalidade] = resultado
                    relatorio["modalidades"][modalidade] = {
                        "status": "ok",
                        "tentativas": tentativa,
                        "cursos": len(resultado["df_cursos"]),
                        "escolas": sum(len(v) for v in resultado["escolas_por_campus"].values()),
                        "cards": resultado["cards"] if resultado["cards"] is not None else "-",
                    }
                    ok = True
                    break
                if tentativa < MAX_TENTATIVAS:
                    logger.warning(f"{modalidade} falhou na tentativa {tentativa}; "
                                   f"tentando novamente em {AGUARDO_RETRY}s...")
                    log_relatorio(f"[scraper] {modalidade} tentativa {tentativa} falhou; nova tentativa em {AGUARDO_RETRY}s")
                    time.sleep(AGUARDO_RETRY)
            if not ok:
                falhas.append(modalidade)
                relatorio["modalidades"][modalidade] = {
                    "status": "falha",
                    "tentativas": MAX_TENTATIVAS,
                    "motivo": "cursos/escolas/cards não coletados após todas as tentativas",
                }

        if falhas:
            relatorio["status"] = "ABORTADA"
            relatorio["motivo"] = f"Modalidades com falha após {MAX_TENTATIVAS} tentativas: {falhas}"
            relatorio["acao"] = "Ação: arquivos parciais movidos para quarentena; base NÃO atualizada."
            logger.error(f"=== COLETA ABORTADA — base não atualizada. Falhas: {falhas} ===")
            limpar_arquivos_parciais(coleta_ts)
            relatorio["fim"] = datetime.now()
            emitir_relatorio(relatorio)
            sys.exit(2)

        cards_por_modalidade = {}
        for modalidade, resultado in dados.items():
            save_painel_cursos(resultado["df_cursos"], modalidade, coleta_ts)
            save_painel_escolas(resultado["escolas_por_campus"], resultado["resumo_por_campus"], modalidade, coleta_ts)
            if resultado["cards"] is not None:
                cards_por_modalidade[modalidade] = resultado["cards"]

        if cards_por_modalidade:
            save_cards(cards_por_modalidade, coleta_ts)

        relatorio["status"] = "COMPLETA"
        relatorio["motivo"] = ""
        relatorio["acao"] = "Ação: arquivos salvos em dados/input; processa_v2 fará o merge."
        logger.info("=== COLETA COMPLETA — todas as modalidades coletadas ===")
        relatorio["fim"] = datetime.now()
        emitir_relatorio(relatorio)
        sys.exit(0)

    except Exception as e:
        logger.error(f"Erro fatal no scraper: {e}", exc_info=True)
        relatorio["fim"] = datetime.now()
        relatorio["motivo"] = f"erro inesperado: {e}"
        relatorio["acao"] = "Ação: base NÃO atualizada."
        emitir_relatorio(relatorio)
        sys.exit(1)

    finally:
        driver.quit()
        logger.info("=== Fim ===")


if __name__ == "__main__":
    main()