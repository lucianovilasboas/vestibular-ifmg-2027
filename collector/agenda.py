import schedule
import time
from run_collect import executar_com_lock
from log import logger

AGENDAS = ["07:00", "09:00", "12:00", "15:00", "18:00", "20:00", "22:00"]


if __name__ == "__main__":
    logger.info("Iniciando agendador de coletas...")
    for a in AGENDAS:
        schedule.every().day.at(a).do(executar_com_lock)
        logger.info(f"Coleta agendada para {a}")

    logger.info("Executando primeira coleta ao subir o container...")
    executar_com_lock()

    while True:
        schedule.run_pending()
        time.sleep(10)
