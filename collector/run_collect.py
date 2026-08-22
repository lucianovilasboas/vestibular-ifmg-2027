import subprocess
import sys
import os
import fcntl
from datetime import datetime
from log import logger
from relatorio import log_relatorio, abrir_bloco, fechar_bloco

PYTHON = sys.executable
LOCK_FILE = "./dados/.coleta.lock"


def executar():
    ts = datetime.now().strftime("%d-%m-%Y %H:%M:%S")
    logger.info(f"Coleta iniciada às {ts}")
    log_relatorio(f"[run] Coleta iniciada às {ts}")

    print(f"[{ts}] Executando scraper_v4.py...")
    r = subprocess.run([PYTHON, "scraper_v4.py"])
    logger.info(f"scraper_v4.py finalizado (exit {r.returncode})")

    if r.returncode == 0:
        print(f"[{ts}] Coleta completa — executando processa_v2.py...")
        r2 = subprocess.run([PYTHON, "processa_v2.py"])
        logger.info(f"processa_v2.py finalizado (exit {r2.returncode})")
        if r2.returncode == 0:
            log_relatorio(f"[run] Coleta finalizada às {datetime.now().strftime('%d-%m-%Y %H:%M:%S')} "
                          f"— status COMPLETA (base atualizada)")
        else:
            log_relatorio(f"[run] processa_v2 finalizado com exit {r2.returncode} — revisar relatório acima")
    else:
        logger.error("Coleta ABORTADA — processa_v2 não executado; base NÃO atualizada.")
        log_relatorio(f"[run] scraper exit={r.returncode} → COLETA ABORTADA; processa_v2 NÃO executado; "
                      f"base NÃO atualizada")

    fechar_bloco()


def executar_com_lock():
    """Executa a coleta respeitando um lock (evita coleta concorrente agendada × manual)."""
    os.makedirs(os.path.dirname(LOCK_FILE) or '.', exist_ok=True)
    with open(LOCK_FILE, 'w') as lf:
        try:
            fcntl.flock(lf, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            logger.error("Já existe uma coleta em andamento — esta execução foi ignorada (lock).")
            log_relatorio("[run] Coleta ignorada: já existe outra em andamento (lock).")
            return
        abrir_bloco()
        executar()


if __name__ == "__main__":
    executar_com_lock()
