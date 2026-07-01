FROM node:24-alpine as base

RUN apk update

RUN npm install -g pnpm

RUN mkdir -p /app/packages

ADD package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json /app/
ADD packages/api /app/packages/api
ADD packages/domain /app/packages/domain

WORKDIR /app/packages/api

FROM base as dev

RUN pnpm -F @projet-igsn/api install --frozen-lockfile

CMD ["pnpm", "-F", "@projet-igsn/api", "dev"]

FROM base

RUN pnpm -F @projet-igsn/api install --prod --frozen-lockfile 

CMD ["pnpm", "-F", "@projet-igsn/api", "start"]
