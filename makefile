default: help

# The e2e stack: prod-built apps + auth stack on shifted ports (own compose
# project so it runs beside `make dev`). Bring it up, wait until it answers, and
# tear it down (incl. the throwaway pg volume) when the calling recipe exits.
E2E_COMPOSE = docker compose -p igsn-e2e -f docker-compose.e2e.yml
E2E_URL = ADMIN_URL=http://localhost:4001 FRONTEND_URL=http://localhost:4000
E2E_UP = trap '$(E2E_COMPOSE) down -v' EXIT; \
	$(E2E_COMPOSE) up -d --build && \
	echo "waiting for admin, frontend, keycloak and saml-idp..." && \
	timeout 300 sh -c 'until curl -sfo /dev/null http://localhost:4001 && curl -sfo /dev/null http://localhost:4000 && curl -sfo /dev/null http://localhost:18080/realms/igsn/.well-known/openid-configuration && curl -sfo /dev/null http://localhost:18081/simplesaml/saml2/idp/metadata.php; do sleep 2; done'

help:									## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(firstword $(MAKEFILE_LIST)) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

install:								## Install dependencies
	@pnpm install
	@pnpm exec playwright install

lint:
	@pnpm lint:apply
	@pnpm fmt:apply

test:
	@pnpm test

test-browser:
	@pnpm test:browser

test-watch:
	@pnpm test:watch

test-e2e:								## Start a throwaway prod stack, run auth e2e tests, tear down
	@$(E2E_UP) && $(E2E_URL) pnpm test:e2e

test-e2e-ui:								## Same, but open Playwright UI mode (http://localhost:8090)
	@$(E2E_UP) && $(E2E_URL) pnpm test:e2e:ui

dev:
	docker compose \
		-f docker-compose.dev.yml \
		up  \
		--watch \
		--build \
		--attach admin --attach api --attach frontend

db-migrate:								## Run migrations on the local dev Postgres (dev stack must be up)
	@docker compose -f docker-compose.dev.yml run --rm api pnpm -F @projet-igsn/api migrate

db-seed:									## Seed the local dev Postgres with sample data (dev stack must be up, migrations applied)
	@docker compose -f docker-compose.dev.yml exec -T api pnpm -F @projet-igsn/api seed

db-reset:								## Fully reset the dev Postgres database, then re-run migrations (dev stack must be up)
	@docker compose -f docker-compose.dev.yml exec -T postgres \
		psql -U igsn -d igsn -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
	@docker compose -f docker-compose.dev.yml run --rm api pnpm -F @projet-igsn/api migrate

material-tree:							## Dump the full material tree, indented by depth
	@pnpm -F @projet-igsn/domain material-tree

material-tree-json:						## Dump the material vocabulary structure as JSON
	@pnpm -F @projet-igsn/domain material-tree:json

generate-routes:
	@pnpm -F @projet-igsn/frontend generate-routes

preprod-deploy:							## Deploy to preprod over SSH (requires DOMAIN=...)
	@DOMAIN=$(DOMAIN) ./infra/preprod/scripts/deploy.sh

preprod-ssh:							## Open temporary SSH access to the preprod host and connect
	@./infra/preprod/scripts/ssh-access.sh connect

preprod-ssh-send-key:					## Install your SSH key on the preprod host (optional SSH_PUBLIC_KEY_PATH=...)
	@./infra/preprod/scripts/ssh-send-key.sh "$(SSH_PUBLIC_KEY_PATH)"

preprod-tofu-init:						## Init preprod tofu (S3 backend)
	@tofu -chdir=infra/preprod/tf init -backend-config=backend.hcl

preprod-tofu-plan:						## Plan preprod infra changes
	@tofu -chdir=infra/preprod/tf plan

preprod-tofu-apply:						## Apply preprod infra changes
	@tofu -chdir=infra/preprod/tf apply
