#!/usr/bin/env bash
# Builds and deploys Nines to AWS: infrastructure (CDK), database migrations, then the web app.
# Usage: AWS_PROFILE=personal ./scripts/deploy.sh   (defaults to the "personal" profile)
set -euo pipefail
cd "$(dirname "$0")/.."

export AWS_PROFILE="${AWS_PROFILE:-personal}"
export AWS_REGION="${AWS_REGION:-ap-southeast-1}"
export CDK_DEFAULT_REGION="$AWS_REGION"

# `aws login` sessions aren't read by every SDK, so hand CDK plain temporary credentials.
eval "$(aws configure export-credentials --profile "$AWS_PROFILE" --format env)"
unset AWS_PROFILE
export CDK_DEFAULT_ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
echo "Deploying to account $CDK_DEFAULT_ACCOUNT in $AWS_REGION"

echo "==> Building"
pnpm install --frozen-lockfile
pnpm --filter api build
pnpm --filter api bundle
pnpm --filter web build

echo "==> Infrastructure"
if ! aws cloudformation describe-stacks --stack-name CDKToolkit >/dev/null 2>&1; then
  (cd infra && npx cdk bootstrap "aws://$CDK_DEFAULT_ACCOUNT/$AWS_REGION")
fi
(cd infra && npx cdk deploy --require-approval never --outputs-file cdk-outputs.json)
out() { node -p "require('./infra/cdk-outputs.json').Nines.$1"; }

echo "==> Database migrations (the database may take ~15s to wake up)"
aws lambda invoke --function-name "$(out MigrateFunction)" --cli-read-timeout 310 /tmp/nines-migrate.json >/dev/null
cat /tmp/nines-migrate.json; echo
if grep -q errorMessage /tmp/nines-migrate.json; then exit 1; fi

echo "==> Web app"
APP_ID="$(out AmplifyAppId)"
ZIP="$(mktemp -d)/web.zip"
(cd apps/web/build/client && zip -qr "$ZIP" .)
read -r JOB_ID UPLOAD_URL < <(aws amplify create-deployment --app-id "$APP_ID" --branch-name main \
  --query '[jobId, zipUploadUrl]' --output text)
curl -sSf -X PUT -T "$ZIP" -H "Content-Type: application/zip" "$UPLOAD_URL"
aws amplify start-deployment --app-id "$APP_ID" --branch-name main --job-id "$JOB_ID" >/dev/null
while :; do
  STATUS="$(aws amplify get-job --app-id "$APP_ID" --branch-name main --job-id "$JOB_ID" --query job.summary.status --output text)"
  case "$STATUS" in
    SUCCEED) break ;;
    FAILED | CANCELLED) echo "Amplify deployment $STATUS"; exit 1 ;;
    *) sleep 5 ;;
  esac
done

echo "==> Done: $(out WebUrl)"
