FROM node:24-alpine as base

RUN apk update

RUN npm install -g pnpm

RUN mkdir -p /app/packages

ADD package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json /app/
ADD packages/admin /app/packages/admin
ADD packages/domain /app/packages/domain

WORKDIR /app/packages/admin

FROM base as dev

RUN pnpm -F @projet-igsn/admin install --frozen-lockfile

CMD ["pnpm", "-F", "@projet-igsn/admin", "dev"]
