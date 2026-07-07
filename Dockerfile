# =============================================================================
# Stage 1: Build — install all deps, compile API bundle + Vite frontend
# =============================================================================
FROM node:24-slim AS builder

RUN corepack enable
WORKDIR /app

COPY . .
RUN pnpm install --frozen-lockfile

# Build Express API server (esbuild → artifacts/api-server/dist/index.mjs)
RUN pnpm --filter @workspace/api-server run build

# Build Vite frontend (BASE_PATH=/ for root-mounted single-domain deploy)
RUN BASE_PATH=/ pnpm --filter @workspace/proconnect run build

# =============================================================================
# Stage 2: Extract lean production node_modules with pnpm deploy
# =============================================================================
FROM node:24-slim AS deployer

RUN corepack enable
WORKDIR /app

COPY --from=builder /app .
# Creates /standalone with only the production runtime deps of the API server
RUN pnpm --filter @workspace/api-server deploy --prod /standalone

# =============================================================================
# Stage 3: Final runtime image — only what's needed to run
# =============================================================================
FROM node:24-slim AS runner

WORKDIR /app

# Production node_modules (only externalized runtime packages, e.g. @google-cloud/storage)
COPY --from=deployer /standalone/node_modules ./node_modules

# Built API bundle + pino worker files
COPY --from=builder /app/artifacts/api-server/dist ./dist

# Built Vite frontend static files
COPY --from=builder /app/artifacts/proconnect/dist/public ./static

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nodejs
USER nodejs

ENV NODE_ENV=production
ENV PORT=8080
# Express will serve ./static at / and return index.html for SPA routes
ENV STATIC_DIR=/app/static

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:8080/api/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "--enable-source-maps", "dist/index.mjs"]
