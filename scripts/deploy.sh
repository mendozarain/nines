#!/usr/bin/env bash
# Deploy Nines to ap-southeast-2. Run this from a laptop after `aws login --profile personal`.
# Creates the Aurora cluster if it is missing, deploys the Nines stack, migrates, optionally seeds, and publishes the site.
#
#   ./scripts/deploy.sh
#   ./scripts/deploy.sh --profile personal --seed
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROFILE="${AWS_PROFILE:-personal}"
SEED=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --profile)
      PROFILE="${2:?--profile needs a name}"
      shift 2
      ;;
    --seed)
      SEED=1
      shift
      ;;
    --help|-h)
      echo "Usage: ./scripts/deploy.sh [--profile personal] [--seed]"
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      echo "Usage: ./scripts/deploy.sh [--profile personal] [--seed]" >&2
      exit 1
      ;;
  esac
done

export AWS_PROFILE="$PROFILE"
export AWS_REGION="ap-southeast-2"
export AWS_DEFAULT_REGION="ap-southeast-2"
ACCOUNT="460047018105"
REGION="ap-southeast-2"

if ! command -v aws >/dev/null 2>&1; then
  echo "The AWS CLI is not installed." >&2
  exit 1
fi
if ! aws sts get-caller-identity --profile "$PROFILE" >/dev/null 2>&1; then
  echo "No credentials for profile $PROFILE. Run: aws login --profile $PROFILE" >&2
  exit 1
fi

CALLER="$(aws sts get-caller-identity --profile "$PROFILE" --query Account --output text)"
if [[ "$CALLER" != "$ACCOUNT" ]]; then
  echo "Profile $PROFILE is account $CALLER. Nines deploys only to $ACCOUNT in $REGION." >&2
  exit 1
fi

pnpm install
pnpm --filter @nines/shared build

echo "Ensuring the nines Aurora cluster exists…"
bash infra/scripts/create-database.sh nines >/dev/null
DB_HOST="$(aws rds describe-db-clusters --region "$REGION" --db-cluster-identifier nines --query 'DBClusters[0].Endpoint' --output text)"
DB_CLUSTER_RESOURCE_ID="$(aws rds describe-db-clusters --region "$REGION" --db-cluster-identifier nines --query 'DBClusters[0].DbClusterResourceId' --output text)"
echo "Database host: $DB_HOST"
echo "Cluster resource id: $DB_CLUSTER_RESOURCE_ID"

echo "Deploying the Nines stack…"
pnpm --filter @nines/infra exec cdk deploy Nines \
  --require-approval never \
  --profile "$PROFILE" \
  -c "account=$ACCOUNT" \
  -c "region=$REGION" \
  -c "dbHost=$DB_HOST" \
  -c "dbClusterResourceId=$DB_CLUSTER_RESOURCE_ID"

output() {
  aws cloudformation describe-stacks --region "$REGION" --stack-name Nines \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}

APP_URL="$(output AppUrl)"
if [[ -z "$APP_URL" || "$APP_URL" == "None" ]]; then
  echo "The stack did not publish an AppUrl." >&2
  exit 1
fi

TMP_ENV="$(mktemp)"
chmod 600 "$TMP_ENV"
cat >"$TMP_ENV" <<EOF
WEB_ORIGIN=$APP_URL
BETTER_AUTH_URL=$APP_URL
TRUSTED_ORIGINS=$APP_URL
EOF
bash infra/scripts/push-secrets.sh "$TMP_ENV"
rm -f "$TMP_ENV"

if [[ "$SEED" == "1" ]]; then
  echo "Applying migrations and seeding the demo station (this replaces demo@nines.local if it already exists)…"
else
  echo "Applying migrations…"
fi
MIGRATE_ARGS=()
if [[ "$SEED" == "1" ]]; then
  MIGRATE_ARGS+=(--seed)
fi
DB_HOST="$DB_HOST" DB_NAME="nines" DB_USER="nines_app" DB_ADMIN_USER="postgres" DB_PORT="5432" \
  pnpm --filter @nines/api exec tsx src/migrate.ts ${MIGRATE_ARGS[@]+"${MIGRATE_ARGS[@]}"}

bash infra/scripts/deploy-frontend.sh
echo
echo "Nines is live at $APP_URL"
if [[ "$SEED" == "1" ]]; then
  echo "Demo login: demo@nines.local / station123"
fi
