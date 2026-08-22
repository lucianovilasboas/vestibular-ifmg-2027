"""Log dedicado de coleta (logs/relatorio_coleta.log) para monitoramento."""
import os

RELATORIO_FILE = "./logs/relatorio_coleta.log"


def log_relatorio(linha=""):
    """Appende uma linha ao log dedicado de coleta."""
    try:
        os.makedirs("./logs", exist_ok=True)
        with open(RELATORIO_FILE, "a", encoding="utf-8") as f:
            f.write(linha + "\n")
    except Exception as e:
        print(f"[relatorio] erro ao escrever {RELATORIO_FILE}: {e}")


def abrir_bloco(titulo="===== RELATÓRIO DE COLETA ====="):
    log_relatorio("")
    log_relatorio(titulo)


def fechar_bloco():
    log_relatorio("=" * 30)
