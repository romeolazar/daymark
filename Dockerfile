FROM node:20-alpine AS base

RUN apk add --no-cache libc6-compat openssl

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

COPY package*.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/next.config.mjs ./next.config.mjs

RUN addgroup -S nodejs \
  && adduser -S nextjs -G nodejs \
  && mkdir -p /app/public/uploads \
  && chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 1403

CMD ["npm", "run", "start"]
