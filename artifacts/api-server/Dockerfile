# ── Stage 1: Build ────────────────────────────────────────────────────────────
# Uses Debian (glibc) so esbuild's linux-x64 native binary works reliably.
FROM node:24-slim AS builder

RUN corepack enable

WORKDIR /app

# Copy workspace config — do this before source so layer is cached when deps don't change
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json tsconfig.json ./

# Copy only the packages needed by the API server
COPY lib/db ./lib/db
COPY lib/api-zod ./lib/api-zod
COPY artifacts/api-server ./artifacts/api-server

# Install all workspace deps (frozen to match lockfile exactly)
RUN pnpm install --frozen-lockfile

# Compile — esbuild bundles everything into dist/index.mjs
RUN pnpm --filter @workspace/api-server run build


# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
# Alpine keeps the final image small (~120 MB). Only runs the bundled output —
# esbuild is not needed here.
FROM node:24-alpine AS runner

WORKDIR /app

# Install only the packages that esbuild externalised (not bundled):
#   @google-cloud/storage  — avatar / object storage
#   @aws-sdk/client-secrets-manager — reads env vars from AWS Secrets Manager at startup
RUN npm install --no-package-lock --omit=dev \
    @google-cloud/storage@^7.19.0 \
    @aws-sdk/client-secrets-manager@^3

# Bundled application
COPY --from=builder /app/artifacts/api-server/dist ./dist

# Startup wrapper: loads secrets from AWS Secrets Manager, then starts the app
COPY artifacts/api-server/load-secrets.mjs ./

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "--enable-source-maps", "load-secrets.mjs"]
