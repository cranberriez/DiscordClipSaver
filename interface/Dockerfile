FROM node:20-alpine@sha256:b88333c42c23fbd91596ebd7fd10de239cedab9617de04142dde7315e3bc0afa AS builder
WORKDIR /app
COPY interface/package*.json ./
RUN npm ci
COPY interface/ .
RUN npm run build

FROM node:20-alpine@sha256:b88333c42c23fbd91596ebd7fd10de239cedab9617de04142dde7315e3bc0afa AS runner
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