FROM node:24.22.1-bookworm-slim AS base

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS migrate

COPY --from=gcr.io/cloud-sql-connectors/cloud-sql-proxy:2.25.4 /cloud-sql-proxy /usr/local/bin/cloud-sql-proxy
COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts

FROM dependencies AS build

COPY . .
RUN npm run build

FROM base AS runtime

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
