# ── Stage 1: builder — install deps, build the Angular app, prep the server ──
FROM node:20 AS builder

# Build argument for cache busting / layer cache reuse
ARG BUILDKIT_INLINE_CACHE=1

WORKDIR /app
COPY . .

# Fresh install + production build (outputs to dist/www/en), then brotli-compress.
RUN yarn && yarn add moment && yarn add vis-util && npm run build
RUN npm run compress:brotli

# Express static client-assets (the CI pipeline injects assets/CBP/client-assets
# into the build context) + the server's own production deps (from dist/package.json).
WORKDIR /app/dist
COPY assets/CBP/client-assets/dist www/en/assets
RUN npm install --production

# ── Stage 2: runtime — slim image with only the built site + Express server ──
# Drops the full node toolchain, root node_modules, .git, source and build cache
# that bloated the single-stage image to ~3.5 GB (and made cold image pulls slow
# enough to trip the Helm --atomic deploy timeout). Same Debian base family as the
# builder, so any installed node_modules stay binary-compatible.
FROM node:20-slim AS runtime

WORKDIR /app/dist

# Built site (www/en + brotli), server.js/index.js/package.json, and the server's
# node_modules — everything needed to run, nothing from the build toolchain.
COPY --from=builder /app/dist ./

EXPOSE 3024

CMD [ "npm", "run", "serve:prod" ]
