# Palle Girate: app Next.js + database SQLite in un solo container.
# Build:  docker build -t palle-girate .
# Avvio:  vedi docker-compose.yml (consigliato) o la sezione Docker del README.
FROM node:22-bookworm-slim AS base
# OpenSSL serve al motore di Prisma.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npx prisma generate && npm run build

FROM base AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_URL="file:/data/palle-girate.db?connection_limit=1" \
    PORT=3000
# Si tiene l'intero node_modules: servono il CLI di Prisma (crea le tabelle) e tsx (seed) oltre a Next.
COPY --from=build /app/node_modules ./node_modules
# frontend/ comprende la build (.next); backend/ la logica e lo schema Prisma.
COPY --from=build /app/frontend ./frontend
COPY --from=build /app/backend ./backend
COPY --from=build /app/package.json /app/tsconfig.json ./
# Il database vive nel volume /data; l'app gira come utente non privilegiato.
RUN mkdir -p /data && chown -R node:node /data /app
USER node
VOLUME ["/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/it/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# All'avvio: crea/aggiorna le tabelle, carica il seed (idempotente; SEED=false per saltarlo), avvia il server.
CMD ["sh", "-c", "npx prisma db push --skip-generate && if [ \"$SEED\" != \"false\" ]; then npx tsx backend/prisma/seed.ts; fi && cd frontend && exec npx next start -H 0.0.0.0 -p 3000"]
