# Partial S3 backend config. The state bucket must pre-exist; locking is
# S3-native (use_lockfile), so no DynamoDB table is needed.
#   tofu -chdir=infra/preprod/tf init -backend-config=backend.hcl
bucket         = "igsn-tofu-state-478514579251-eu-west-3-an"
key            = "preprod/terraform.tfstate"
region         = "eu-west-3"
use_lockfile   = true
encrypt        = true
