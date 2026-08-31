FROM node:24-alpine AS base

ENV HUSKY=0

RUN apk upgrade --no-cache && apk add --no-cache curl

RUN npm install -g pnpm

RUN mkdir -p /app/packages && chown node:node /app /app/packages
USER node

ADD --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml /app/
ADD --chown=node:node packages/frontend/package.json /app/packages/frontend/
ADD --chown=node:node packages/domain/package.json /app/packages/domain/
ADD --chown=node:node packages/design-system/package.json /app/packages/design-system/

WORKDIR /app/packages/frontend

RUN pnpm -F "@projet-igsn/frontend..." install --frozen-lockfile

ADD --chown=node:node tsconfig.base.json /app/
ADD --chown=node:node packages/frontend /app/packages/frontend
ADD --chown=node:node packages/domain /app/packages/domain
ADD --chown=node:node packages/design-system /app/packages/design-system

FROM base AS dev

CMD ["pnpm", "-F", "@projet-igsn/frontend", "dev"]

FROM base AS build

ARG VITE_API_URL=http://localhost:3000/api
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm -F @projet-igsn/frontend build

FROM node:24-alpine AS prod

RUN apk upgrade --no-cache && apk add --no-cache curl

WORKDIR /app

ENV PORT=8080

COPY --from=build /app/packages/frontend/.output /app/.output

USER node

CMD ["node", ".output/server/index.mjs"]
