#!/usr/bin/env bash
# Scaffold only. Do not treat this as a finished production deploy.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "Building Nines locally before a CDK deploy."
pnpm install
pnpm --filter @nines/shared build
pnpm --filter @nines/web build

if ! command -v aws >/dev/null 2>&1; then
  echo "AWS CLI is not available. The CDK stack in infra/ is a scaffold and was not deployed."
  exit 1
fi

cd infra
npx cdk deploy --require-approval never --profile "${AWS_PROFILE:-personal}"
echo "CDK deploy finished the scaffold only."
echo "Still to do later: bundle the Nest API for Lambda, run migrations inside the VPC, and publish the web build to Amplify."
