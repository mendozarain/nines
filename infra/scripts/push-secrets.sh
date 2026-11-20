#!/usr/bin/env bash
# Merges KEY=VALUE lines from an env file into the nines/app secret, keeping keys already there
# (such as the generated BETTER_AUTH_SECRET). Values are read from the file and never printed.
#
# infra/scripts/push-secrets.sh path/to/app.env
set -euo pipefail

ENV_FILE="${1:?usage: push-secrets.sh path/to/app.env}"
REGION="${AWS_REGION:-ap-southeast-2}"
AWS_ARGS=(--region "$REGION")
if [[ -n "${AWS_PROFILE:-}" ]]; then
  AWS_ARGS+=(--profile "$AWS_PROFILE")
fi
SECRET_ID="${2:-nines/app}"

CURRENT="$(aws secretsmanager get-secret-value "${AWS_ARGS[@]}" --secret-id "$SECRET_ID" --query SecretString --output text)"

MERGED="$(CURRENT="$CURRENT" python3 - "$ENV_FILE" <<'PY'
import json, os, sys

skip_exact = {"DATABASE_URL", "PORT", "NODE_ENV"}
skip_prefix = ("AWS_",)
secret = json.loads(os.environ["CURRENT"])
for raw in open(sys.argv[1], encoding="utf-8"):
    line = raw.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    key, value = line.split("=", 1)
    key = key.strip().removeprefix("export ").strip()
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
        value = value[1:-1]
    if not value or key in skip_exact or key.startswith(skip_prefix):
        continue
    secret[key] = value
print(json.dumps(secret))
PY
)"

aws secretsmanager put-secret-value "${AWS_ARGS[@]}" --secret-id "$SECRET_ID" --secret-string "$MERGED" >/dev/null
python3 -c 'import json,sys; print("Updated", len(json.loads(sys.argv[1])), "keys in", sys.argv[2])' "$MERGED" "$SECRET_ID"
