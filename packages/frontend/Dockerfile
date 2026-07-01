FROM node:24-alpine as base

RUN apk update

RUN npm install -g pnpm

RUN mkdir -p /app/packages

ADD package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json /app/
ADD packages/frontend /app/packages/frontend
ADD packages/domain /app/packages/domain
ADD packages/design-system /app/packages/design-system

WORKDIR /app/packages/frontend

FROM base as dev

RUN pnpm -F @projet-igsn/frontend install --frozen-lockfile

CMD ["pnpm", "-F", "@projet-igsn/frontend", "dev"]
