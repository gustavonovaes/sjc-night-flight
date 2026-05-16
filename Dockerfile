# ── Stage 1: build frontend ───────────────────────────────────────────────────
FROM oven/bun:1-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN bun install

COPY . .
RUN bun run build

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM oven/bun:1-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY src/server.ts ./src/server.ts

ENV PORT=443
EXPOSE 443

CMD ["bun", "src/server.ts"]
