FROM node:20-alpine AS base

RUN apk add --no-cache libc6-compat openssl tzdata

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npm run build

FROM base AS runner

ENV NODE_ENV=production
ENV PORT=1403
ENV DATABASE_URL=file:/app/data/daymark.db
ENV CHECKPOINT_DISABLE=1

COPY package*.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN addgroup -S nodejs \
  && adduser -S nextjs -G nodejs \
  && mkdir -p /app/data /app/public/uploads \
  && chown -R nextjs:nodejs /app

USER nextjs

VOLUME ["/app/data"]

EXPOSE 1403

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:' + (process.env.PORT || 1403), r => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node_modules/.bin/next", "start"]
