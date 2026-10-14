import { fileURLToPath } from "node:url";
import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { HttpApi } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { CfnApp, CfnBranch } from "aws-cdk-lib/aws-amplify";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import * as rds from "aws-cdk-lib/aws-rds";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import type { Construct } from "constructs";

const apiDir = (p: string) => fileURLToPath(new URL(`../../apps/api/.lambda/${p}`, import.meta.url));

/**
 * Everything scales to zero when nobody is using the app:
 * - Aurora Serverless v2 (PostgreSQL) pauses after 10 idle minutes (0 ACU).
 * - The NestJS API runs on Lambda behind an HTTP API.
 * - The React Router SPA is static files on Amplify Hosting, which proxies /api/* to the API
 *   so auth cookies stay first-party.
 *
 * The VPC has no NAT gateway (saves ~$35/month). Lambdas reach only the database, so secrets
 * are resolved into their environment at deploy time instead of fetched at runtime.
 */
export class NinesStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [{ name: "isolated", subnetType: ec2.SubnetType.PRIVATE_ISOLATED, cidrMask: 24 }],
    });

    const db = new rds.DatabaseCluster(this, "Db", {
      engine: rds.DatabaseClusterEngine.auroraPostgres({ version: rds.AuroraPostgresEngineVersion.VER_16_13 }),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      writer: rds.ClusterInstance.serverlessV2("writer"),
      serverlessV2MinCapacity: 0,
      serverlessV2MaxCapacity: 2,
      serverlessV2AutoPauseDuration: Duration.minutes(10),
      // Letters and digits only, so the password drops straight into a connection URL.
      credentials: rds.Credentials.fromGeneratedSecret("nines", {
        excludeCharacters: " %+~`#$&*()|[]{}:;<>?!'/@\"\\^=,.-_",
      }),
      defaultDatabaseName: "nines",
      storageEncrypted: true,
      backup: { retention: Duration.days(7) },
      removalPolicy: RemovalPolicy.SNAPSHOT,
    });
    const dbSecret = db.secret!;

    const authSecret = new Secret(this, "AuthSecret", {
      description: "Better Auth signing secret for Nines",
      generateSecretString: { passwordLength: 48, excludePunctuation: true },
    });

    // The API needs the web URL for auth, and Amplify's rewrite needs the API URL.
    const httpApi = new HttpApi(this, "Api", { description: "Nines API" });

    const web = new CfnApp(this, "Web", {
      name: "nines",
      platform: "WEB",
      customRules: [
        // Same-origin API: the browser calls /api/*, Amplify forwards to API Gateway.
        { source: "/api/<*>", target: `${httpApi.apiEndpoint}/api/<*>`, status: "200" },
        // SPA fallback: any path without a file extension serves index.html.
        {
          source: "</^[^.]+$|\\.(?!(css|gif|ico|jpg|jpeg|js|png|txt|svg|woff|woff2|ttf|map|json|webp|webmanifest)$)([^.]+$)/>",
          target: "/index.html",
          status: "200",
        },
      ],
    });
    const branch = new CfnBranch(this, "WebMain", { appId: web.attrAppId, branchName: "main", stage: "PRODUCTION" });
    const webUrl = `https://${branch.branchName}.${web.attrDefaultDomain}`;

    const dbUrl = [
      "postgresql://",
      dbSecret.secretValueFromJson("username").unsafeUnwrap(),
      ":",
      dbSecret.secretValueFromJson("password").unsafeUnwrap(),
      "@",
      db.clusterEndpoint.hostname,
      ":5432/nines?sslmode=no-verify",
    ].join("");

    const lambdaDefaults = {
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      handler: "index.handle",
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
    } satisfies Partial<lambda.FunctionProps>;

    const apiFn = new lambda.Function(this, "ApiFn", {
      ...lambdaDefaults,
      functionName: "nines-api",
      logGroup: new logs.LogGroup(this, "ApiLogs", { retention: logs.RetentionDays.ONE_MONTH }),
      code: lambda.Code.fromAsset(apiDir("api")),
      memorySize: 1024,
      // A paused database takes ~15s to resume; API Gateway's own limit is 30s.
      timeout: Duration.seconds(29),
      environment: {
        NODE_OPTIONS: "--enable-source-maps",
        DATABASE_URL: dbUrl,
        BETTER_AUTH_SECRET: authSecret.secretValue.unsafeUnwrap(),
        BETTER_AUTH_URL: webUrl,
        WEB_ORIGIN: webUrl,
      },
    });
    db.connections.allowDefaultPortFrom(apiFn);
    httpApi.addRoutes({ path: "/{proxy+}", integration: new HttpLambdaIntegration("ApiInt", apiFn) });

    const migrateFn = new lambda.Function(this, "MigrateFn", {
      ...lambdaDefaults,
      functionName: "nines-migrate",
      logGroup: new logs.LogGroup(this, "MigrateLogs", { retention: logs.RetentionDays.ONE_MONTH }),
      code: lambda.Code.fromAsset(apiDir("migrate")),
      memorySize: 512,
      timeout: Duration.minutes(5),
      environment: { DATABASE_URL: dbUrl, MIGRATIONS_DIR: "/var/task/migrations" },
    });
    db.connections.allowDefaultPortFrom(migrateFn);

    new CfnOutput(this, "WebUrl", { value: webUrl });
    new CfnOutput(this, "AmplifyAppId", { value: web.attrAppId });
    new CfnOutput(this, "ApiUrl", { value: httpApi.apiEndpoint });
    new CfnOutput(this, "MigrateFunction", { value: migrateFn.functionName });
  }
}
