import logging
import os

# Configurando o logging para gravar em um arquivo (persistido em ./logs/)
os.makedirs('./logs', exist_ok=True)
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Criação de um handler para escrever os logs em um arquivo
file_handler = logging.FileHandler('./logs/logs.log')
file_handler.setLevel(logging.INFO)

# Criação de um formatter e adicionando ao handler
formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
file_handler.setFormatter(formatter)

# Adicionando o handler ao logger
logger.addHandler(file_handler)

