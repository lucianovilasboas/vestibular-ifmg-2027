# Vestibular IFMG 2027 — Dashboard

Dashboard de acompanhamento do Processo Seletivo IFMG 2027, com **coleta autônoma** dos dados de inscrições do painel da Fundação CEFET-MG.

- **Stack**: Next.js 16 (App Router) + TypeScript + Tailwind v4 + Recharts (mobile-first) · coleta em Python (Selenium/requests) · Docker Compose.
- **Coleta**: agenda **07h, 09h, 12h, 15h, 18h, 20h e 22h** (fuso `America/Sao_Paulo`), com **retry por modalidade** e **gate de completude** — só coletas com as 3 modalidades (INT/SUB/SUP) válidas entram na base. Se alguma falhar após as tentativas, a coleta é abortada e a base **não é alterada**.
- **Dados**: CSVs persistidos em `./dados` (volume). O dashboard sincroniza sozinho (~30s) quando a coleta atualiza a base.

## Estrutura

```
docker-compose.yml          → produção (VPS + Traefik)
docker-compose.local.yml    → dev local (network host)
Dockerfile / Dockerfile.worker
collector/                  → pipeline de coleta (scraper, processa, validação, relatório)
src/                        → dashboard Next.js
dados/                      → volume: processed/, input/, backup/, quarentena/, vagas_referencia.csv
logs/                       → logs.log (detalhe) + relatorio_coleta.log (relatório de coleta)
coletar.sh                  → coleta manual via linha de comando
```

## Produção (VPS com Docker + Traefik)

1. **Clonar**:
   ```bash
   git clone https://github.com/lucianovilasboas/vestibular-ifmg-2027.git
   cd vestibular-ifmg-2027
   ```
2. **Credenciais** (não estão no repositório — secret):
   ```bash
   cp .env.example .env.local
   nano .env.local   # preencher FCM_USERNAME e FCM_PASSWORD
   ```
3. **Semear o histórico** (opcional, recomendado): copiar `dados/` de um ambiente que já tenha coleta para `./dados`. Sem seed, o worker popula sozinho na primeira coleta (~4 min).
4. **Subir**:
   ```bash
   docker compose up -d --build
   ```
5. **Acesso**: o app sobe em `0.0.0.0:3053` e o Traefik roteia o domínio:
   - `https://ifmg-2027.lucianovilasboas.com.br` → `app` (porta 3053, rede `proxy`).
   - A rede `proxy` (external) precisa existir no Traefik.
   - Porta `3053` também publicada no host; para acesso só pelo domínio, bloqueie 3053 no firewall e mantenha apenas 80/443.
6. **Monitorar**:
   ```bash
   docker compose logs -f worker        # progresso da coleta
   tail -f logs/relatorio_coleta.log    # relatório dedicado de cada coleta
   docker compose logs -f app           # dashboard
   ```
7. **Coleta manual** (a qualquer hora): `./coletar.sh`
8. **Atualizar**: `git pull && docker compose up -d --build`
9. **Backup** (importante — os dados vivem em `./dados`): agende um cron que compacte `./dados` e `./logs`.

## Desenvolvimento local

O daemon Docker local pode não ter a rede `proxy` — use o compose local:

```bash
docker compose -f docker-compose.local.yml up -d
./coletar.sh      # coleta manual
docker compose -f docker-compose.local.yml logs -f worker
```

Dashboard local: `http://localhost:3053/dashboard`

## Segurança

- **Nenhuma chave/credencial é commitada**: `.env.local` (credenciais FCM), dados coletados, logs e token do GitHub ficam fora do repositório (`.gitignore`).
- O token de acesso ao GitHub usado no push deve ser **revogado/rotacionado** após o uso.
- Escrita no painel FCM: apenas leitura via scraper com credenciais do `.env.local`.
