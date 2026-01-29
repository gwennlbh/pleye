FROM oven/bun:1.3.7

ARG VERSION=dev

WORKDIR /app

COPY bun.lock /app/bun.lock
COPY package.json  /app/package.json

RUN bun install --frozen-lockfile

COPY . .

RUN MASTER_KEY=buildingggggg DATABASE_URL=psql://building bun run build

EXPOSE 3000
ENV VERSION=$VERSION

CMD ["bun", "run", "build/index.js"]
