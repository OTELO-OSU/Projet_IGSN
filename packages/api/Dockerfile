FROM node:24-alpine AS base

ENV HUSKY=0

RUN apk upgrade --no-cache && apk add --no-cache curl

RUN npm install -g pnpm

RUN mkdir -p /app/packages

ADD package.json pnpm-lock.yaml pnpm-workspace.yaml /app/
ADD packages/api/package.json /app/packages/api/
ADD packages/domain/package.json /app/packages/domain/

WORKDIR /app/packages/api

FROM base AS dev

RUN pnpm -F "@projet-igsn/api..." install --frozen-lockfile

ADD tsconfig.base.json /app/
ADD packages/api /app/packages/api
ADD packages/domain /app/packages/domain

CMD ["pnpm", "-F", "@projet-igsn/api", "dev"]

FROM base AS prod

ENV PORT=8080

RUN pnpm -F "@projet-igsn/api..." install --prod --frozen-lockfile --ignore-scripts

ADD tsconfig.base.json /app/
ADD packages/api /app/packages/api
ADD packages/domain /app/packages/domain

RUN install -d -o node -g node /data/attachments

USER node

CMD ["node", "src/main.ts"]
