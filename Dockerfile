FROM mcr.microsoft.com/playwright:v1.60.0-noble@sha256:9bd26ad900bb5e0f4dee75839e957a89ae89c2b7ab1e76050e559790e946b948 AS dependencies

ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM dependencies AS builder

COPY prisma ./prisma
RUN pnpm prisma generate

COPY next.config.ts tsconfig.json postcss.config.mjs components.json ./
COPY public ./public
COPY src ./src
RUN pnpm build

FROM dependencies AS tools

COPY prisma ./prisma
COPY scripts ./scripts
RUN pnpm prisma generate
USER pwuser

FROM mcr.microsoft.com/playwright:v1.60.0-noble@sha256:9bd26ad900bb5e0f4dee75839e957a89ae89c2b7ab1e76050e559790e946b948 AS runtime

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3103
WORKDIR /app

COPY --from=builder --chown=pwuser:pwuser /app/.next/standalone ./
COPY --from=builder --chown=pwuser:pwuser /app/.next/static ./.next/static
COPY --from=builder --chown=pwuser:pwuser /app/public ./public

USER pwuser
EXPOSE 3103
CMD ["node", "server.js"]
