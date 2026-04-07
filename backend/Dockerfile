FROM node:20-alpine AS builder
WORKDIR /app

# better-sqlite3 needs native build tools
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json* ./
RUN npm ci --only=production

# ── Production ──────────────────────────────────
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV DB_PATH=/app/data/synthcity.db

RUN addgroup --system --gid 1001 synthcity && \
    adduser --system --uid 1001 synthcity && \
    mkdir -p /app/data && chown synthcity:synthcity /app/data

COPY --from=builder /app/node_modules ./node_modules
COPY . .
RUN rm -f .env .env.* 2>/dev/null; true

USER synthcity
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["node", "api-server.js"]
