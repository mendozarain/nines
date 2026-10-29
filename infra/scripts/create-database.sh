#!/usr/bin/env bash
# Creates the Nines Aurora PostgreSQL Serverless v2 cluster (express configuration) once.
# CloudFormation cannot create express-configuration clusters yet, so this lives outside the stack.
#
# Same shape as the cozy-d714 cluster, but its own identifier (`nines`) in ap-southeast-2:
# PostgreSQL 17.9, IAM auth, min 0 ACU, max 4 ACU, pause after 5 idle minutes.
# Does not modify cozy-d714.
set -euo pipefail

REGION="${AWS_REGION:-ap-southeast-2}"
CLUSTER="${1:-nines}"
if [[ "$CLUSTER" != "nines" ]]; then
  echo "Refusing to touch cluster '$CLUSTER'. This script only manages the Nines cluster (nines), never cozy-d714." >&2
  exit 1
fi
AWS_ARGS=(--region "$REGION")
if [[ -n "${AWS_PROFILE:-}" ]]; then
  AWS_ARGS+=(--profile "$AWS_PROFILE")
fi

if aws rds describe-db-clusters "${AWS_ARGS[@]}" --db-cluster-identifier "$CLUSTER" >/dev/null 2>&1; then
  ENGINE="$(aws rds describe-db-clusters "${AWS_ARGS[@]}" --db-cluster-identifier "$CLUSTER" --query 'DBClusters[0].Engine' --output text)"
  if [[ "$ENGINE" != "aurora-postgresql" ]]; then
    echo "Cluster $CLUSTER exists but its engine is $ENGINE, not aurora-postgresql. Refusing to change it." >&2
    exit 1
  fi
  echo "Cluster $CLUSTER already exists."
else
  aws rds create-db-cluster \
    "${AWS_ARGS[@]}" \
    --db-cluster-identifier "$CLUSTER" \
    --engine aurora-postgresql \
    --with-express-configuration \
    --tags Key=Project,Value=nines
  aws rds wait db-cluster-available "${AWS_ARGS[@]}" --db-cluster-identifier "$CLUSTER"
fi

aws rds modify-db-cluster \
  "${AWS_ARGS[@]}" \
  --db-cluster-identifier "$CLUSTER" \
  --serverless-v2-scaling-configuration MinCapacity=0,MaxCapacity=4,SecondsUntilAutoPause=300 \
  --deletion-protection \
  --apply-immediately >/dev/null

IAM="$(aws rds describe-db-clusters "${AWS_ARGS[@]}" --db-cluster-identifier "$CLUSTER" --query 'DBClusters[0].IAMDatabaseAuthenticationEnabled' --output text)"
if [[ "$IAM" != "True" ]]; then
  aws rds modify-db-cluster \
    "${AWS_ARGS[@]}" \
    --db-cluster-identifier "$CLUSTER" \
    --enable-iam-database-authentication \
    --apply-immediately >/dev/null
fi

aws rds describe-db-clusters "${AWS_ARGS[@]}" --db-cluster-identifier "$CLUSTER" \
  --query 'DBClusters[0].{host:Endpoint,resourceId:DbClusterResourceId,engine:EngineVersion,scaling:ServerlessV2ScalingConfiguration,iam:IAMDatabaseAuthenticationEnabled}'
