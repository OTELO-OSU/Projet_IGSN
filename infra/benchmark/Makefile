SHELL := bash
.SHELLFLAGS := -euo pipefail -c
.ONESHELL:
.DEFAULT_GOAL := help

TS := $(shell date -u +%Y%m%dT%H%M%SZ)
RUNS ?= 30
USERS ?= 1 5 10 20
DURATION ?= 30
grid: SIZES ?= 10000 50000 100000 200000
concurrency: SIZES ?= 50000 100000 200000

DIR = results/$(TS)
COMPOSE = docker compose -f docker-compose.yml
SQL = $(COMPOSE) exec -T postgres psql -U igsn -d igsn -v ON_ERROR_STOP=1 -Atc
RUNNER = $(COMPOSE) exec -T runner pnpm

define RESET
$(COMPOSE) stop api
$(COMPOSE) up -d --wait postgres
$(SQL) "drop schema public cascade; create schema public;"
$(RUNNER) migrate
$(RUNNER) seed:bench --count $(1)
$(SQL) "vacuum analyze"
endef

define START
$(COMPOSE) start api
tries=0
until $(COMPOSE) exec -T api curl -fs -o /dev/null http://localhost:8080/samples; do
	(( ++tries < 60 )) || { echo "The api never answered /samples" >&2; exit 1; }
	sleep 2
done
endef

define CONDITIONS
echo "pg_image,$$(docker inspect -f '{{.Config.Image}}' "$$container")"
echo "pg_version,\"$$($(SQL) 'show server_version')\""
echo "pg_nano_cpus,$$(docker inspect -f '{{.HostConfig.NanoCpus}}' "$$container")"
echo "pg_memory_bytes,$$(docker inspect -f '{{.HostConfig.Memory}}' "$$container")"
echo "pg_memory_swap_bytes,$$(docker inspect -f '{{.HostConfig.MemorySwap}}' "$$container")"
echo "pg_config,\"image default: $$($(SQL) "select replace(string_agg(name || '=' || current_setting(name), '; ' order by name), '\"', '\"\"') from pg_settings where source not in ('default', 'client', 'override', 'session')")\""
echo "api_caps,none"
endef

help: ## Show this help
	@grep -E '^[a-z-]+:.*## ' $(firstword $(MAKEFILE_LIST)) | awk 'BEGIN {FS = ":.*## "} {printf "%-12s %s\n", $$1, $$2}'

up: ## Recreate the stack and migrate
	mkdir -p results
	$(COMPOSE) up -d --force-recreate --remove-orphans
	$(RUNNER) migrate

reset: ## Reseed Postgres with SIZE samples, then vacuum it
	@mkdir -p $(DIR)
	$(call RESET,$(SIZE))

conditions: ## Write the host, Postgres and build conditions to results/TS/conditions.csv
	@mkdir -p $(DIR)
	$(COMPOSE) up -d --wait postgres
	token=$$(curl -fsS -X PUT http://169.254.169.254/latest/api/token -H "X-aws-ec2-metadata-token-ttl-seconds: 60" || true)
	container=$$($(COMPOSE) ps -q postgres)
	{
		echo "key,value"
		echo "instance_type,$$(curl -fsS -H "X-aws-ec2-metadata-token: $$token" http://169.254.169.254/latest/meta-data/instance-type)"
		echo "vcpus,$$(nproc)"
		echo "ram_mib,$$(free -m | awk '/^Mem:/ {print $$2}')"
		$(CONDITIONS)
		echo "node_version,$$($(COMPOSE) exec -T runner node --version)"
		echo "load_generator,runner container on the same host"
		cat build.csv
	} >$(DIR)/conditions.csv

grid: conditions ## Time every case at each of SIZES, RUNS timed calls each, with EXPLAIN plans
	printf 'runs,%s\nsizes,%s\n' '$(RUNS)' '$(SIZES)' >>$(DIR)/conditions.csv
	for size in $(SIZES); do
		$(call RESET,$$size)
		$(RUNNER) bench:grid --size $$size --runs $(RUNS) --out /$(DIR)
	done

concurrency: conditions ## Run the seeded list mix through the api at each of SIZES for each of USERS, DURATION seconds each
	printf 'duration_s,%s\nusers,%s\nsizes,%s\n' '$(DURATION)' '$(USERS)' '$(SIZES)' >>$(DIR)/conditions.csv
	for size in $(SIZES); do
		$(call RESET,$$size)
		$(START)
		$(RUNNER) bench:concurrency --size $$size --users '$(USERS)' --duration $(DURATION) --url http://api:8080 --out /$(DIR)
	done

.PHONY: help up reset conditions grid concurrency
