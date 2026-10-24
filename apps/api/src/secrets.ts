import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";

let loading: Promise<void> | undefined;

// On AWS, application settings live in one Secrets Manager JSON secret (APP_SECRET_ARN).
// Load it before any module that reads configuration at import time (Better Auth).
export function loadSecrets(): Promise<void> {
  loading ??= load();
  return loading;
}

async function load(): Promise<void> {
  const secretId = process.env.APP_SECRET_ARN?.trim();
  if (!secretId) return;
  const client = new SecretsManagerClient({});
  const { SecretString } = await client.send(new GetSecretValueCommand({ SecretId: secretId }));
  if (!SecretString) throw new Error("App secret is empty");
  const values = JSON.parse(SecretString) as Record<string, unknown>;
  for (const [key, value] of Object.entries(values)) {
    if (process.env[key] === undefined && value !== null && value !== undefined) {
      process.env[key] = typeof value === "string" ? value : JSON.stringify(value);
    }
  }
}
