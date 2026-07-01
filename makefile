default: help

# Bring up the services the e2e suite needs (detached), wait until they answer,
# and tear the whole stack down when the calling recipe's shell exits.
E2E_UP = trap 'docker compose -f docker-compose.dev.yml down' EXIT; \
	docker compose -f docker-compose.dev.yml up -d --build keycloak saml-idp admin && \
	echo "waiting for keycloak, saml-idp and admin..." && \
	timeout 240 sh -c 'until curl -sfo /dev/null http://localhost:3001 && curl -sfo /dev/null http://localhost:8080/realms/igsn/.well-known/openid-configuration && curl -sfo /dev/null http://localhost:8081/simplesaml/saml2/idp/metadata.php; do sleep 2; done'

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

test-e2e:								## Start a throwaway stack, run auth e2e tests, tear down
	@$(E2E_UP) && pnpm test:e2e

test-e2e-ui:								## Same, but open Playwright UI mode (http://localhost:8090)
	@$(E2E_UP) && pnpm test:e2e:ui

dev:
	docker compose \
		-f docker-compose.dev.yml \
		up  \
		--watch \
		--build

auth:									## Start only Keycloak + the dev SAML IdP (detached)
	docker compose -f docker-compose.dev.yml up -d keycloak saml-idp

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
