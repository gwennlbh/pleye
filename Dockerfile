FROM oven/bun:1.4.4 AS builder


WORKDIR /app

COPY bun.lock /app/bun.lock
COPY package.json  /app/package.json

RUN bun install --frozen-lockfile

FROM builder AS runner

COPY . .

RUN MASTER_KEY=buildingggggg DATABASE_URL=psql://building bun run build

ARG VERSION=dev
ENV VERSION=$VERSION

EXPOSE 3000

ENTRYPOINT [ "sh", "-c", "bun run db:migrate && bun run build/index.js" ]
