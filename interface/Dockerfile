FROM node:24-alpine@sha256:7a4ef576a570dad463c2e9744e6df118c9c2a3a03a9219122a9dc834e7c8049a AS builder
WORKDIR /app
COPY interface/package*.json ./
RUN npm ci
COPY interface/ .
RUN npm run build

FROM node:24-alpine@sha256:7a4ef576a570dad463c2e9744e6df118c9c2a3a03a9219122a9dc834e7c8049a AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/src/features/docs/content ./src/features/docs/content
COPY settings.default.jsonc /app/settings.default.jsonc

ENV DEFAULT_SETTINGS_PATH=/app/settings.default.jsonc
EXPOSE 3000
CMD ["node", "server.js"]