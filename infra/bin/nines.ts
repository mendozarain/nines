import { App } from "aws-cdk-lib";
import { NinesStack } from "../lib/nines-stack.js";

const app = new App();
new NinesStack(app, "Nines", {
  // Singapore is the closest AWS region to the Philippines.
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION ?? "ap-southeast-1" },
  description: "Nines: accounting for Philippine gas stations",
});
