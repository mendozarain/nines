#!/usr/bin/env bash
# Builds the web app and publishes it to Amplify Hosting (manual deployment, no Git connection).
set -euo pipefail

REGION="${AWS_REGION:-ap-southeast-2}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
AWS_ARGS=(--region "$REGION")
if [[ -n "${AWS_PROFILE:-}" ]]; then
  AWS_ARGS+=(--profile "$AWS_PROFILE")
fi

output() {
  aws cloudformation describe-stacks "${AWS_ARGS[@]}" --stack-name Nines \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}

APP_ID="$(output AmplifyAppId)"
cd "$ROOT"
pnpm --filter @nines/shared build
pnpm --filter @nines/web build
ZIP="$(mktemp -d)/frontend.zip"
(cd apps/web/build/client && zip -qr "$ZIP" .)

read -r JOB_ID UPLOAD_URL < <(aws amplify create-deployment "${AWS_ARGS[@]}" --app-id "$APP_ID" --branch-name main \
  --query '[jobId, zipUploadUrl]' --output text)
curl -fsS -T "$ZIP" "$UPLOAD_URL" >/dev/null
aws amplify start-deployment "${AWS_ARGS[@]}" --app-id "$APP_ID" --branch-name main --job-id "$JOB_ID" >/dev/null

echo "Publishing the site (job $JOB_ID)…"
for _ in $(seq 1 60); do
  STATUS="$(aws amplify get-job "${AWS_ARGS[@]}" --app-id "$APP_ID" --branch-name main --job-id "$JOB_ID" \
    --query 'job.summary.status' --output text)"
  if [[ "$STATUS" == "SUCCEED" ]]; then
    echo "Live at $(output AppUrl)"
    exit 0
  fi
  if [[ "$STATUS" == "FAILED" || "$STATUS" == "CANCELLED" ]]; then
    echo "Amplify deployment $STATUS" >&2
    exit 1
  fi
  sleep 5
done
echo "Timed out waiting for the Amplify deployment" >&2
exit 1
