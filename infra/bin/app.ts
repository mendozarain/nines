#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import path from "node:path";
import * as cdk from "aws-cdk-lib";
import { NinesStack } from "../lib/nines-stack";

const infraRoot = path.join(__dirname, "..");
execFileSync(process.execPath, [path.join(infraRoot, "bundle.mjs")], {
  stdio: "inherit",
  cwd: infraRoot,
});

const app = new cdk.App();

// Pinned so a stray AWS profile cannot deploy Nines outside the owner's Sydney account.
// CDKToolkit is already bootstrapped in this account and region. This stack is not CozyD714.
const account = app.node.tryGetContext("account") ?? "460047018105";
const region = app.node.tryGetContext("region") ?? "ap-southeast-2";

new NinesStack(app, "Nines", {
  env: { account, region },
  description: "Nines gas-station books: Amplify, Lambda API, Aurora Serverless v2. Not the CozyD714 stack.",
});
