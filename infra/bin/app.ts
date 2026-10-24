#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { NinesStack } from "../lib/nines-stack";

const app = new cdk.App();
new NinesStack(app, "NinesStack", {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: "ap-southeast-1" },
  description: "Scaffold for Nines. Not a finished production deploy.",
});
