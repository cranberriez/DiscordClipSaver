# Use multi-stage build for smaller runtime image
FROM node:20-alpine AS deps
WORKDIR /app
COPY interface/package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY interface/ .
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.* ./
COPY settings.default.yml /app/settings.default.yml
ENV DEFAULT_SETTINGS_PATH=/app/settings.default.yml
EXPOSE 3000
CMD ["npm", "run", "start"]