FROM node:22-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
RUN apk add --no-cache tzdata
WORKDIR /app
ENV NODE_ENV=production
ENV TZ=America/Sao_Paulo
ENV PORT=3053

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3053

CMD ["node", "server.js"]
