# syntax=docker/dockerfile:1.7
# ---------------------------------------------------------------------------
# HANU HSK — production image for Google Cloud Run
# One container serves the built web app (dist/) AND the API (server.ts):
# same origin, so login, BinBin AI, class codes and grading all work.
# ---------------------------------------------------------------------------

FROM node:22-slim AS base
WORKDIR /app
# The repo is locked with bun.lock (same version as CI)
RUN npm install -g bun@1.4.4 && npm cache clean --force

# ---- Build web app + server bundle ----------------------------------------
FROM base AS build
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
# Public reCAPTCHA Enterprise site key for Firebase App Check (baked into the
# client at build time). Leave empty if App Check isn't set up yet.
ARG VITE_RECAPTCHA_ENTERPRISE_SITE_KEY=""
ENV VITE_RECAPTCHA_ENTERPRISE_SITE_KEY=${VITE_RECAPTCHA_ENTERPRISE_SITE_KEY}
RUN bun run build

# ---- Production dependencies only -----------------------------------------
FROM base AS prod-deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# ---- Runtime ---------------------------------------------------------------
FROM node:22-slim AS runtime
ENV NODE_ENV=production \
    PORT=8080
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
COPY package.json firebase-applet-config.json ./
USER node
EXPOSE 8080
CMD ["node", "dist-server/server.js"]
