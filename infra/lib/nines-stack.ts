import path from "node:path";
import * as cdk from "aws-cdk-lib";
import * as amplify from "aws-cdk-lib/aws-amplify";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import type { Construct } from "constructs";

const APP_DB_USER = "nines_app";
const ADMIN_DB_USER = "postgres";
const APP_DATABASE = "nines";

/**
 * Nines on AWS. The Aurora express-configuration cluster is created once by
 * infra/scripts/create-database.sh (CloudFormation cannot create it yet).
 * This stack is separate from CozyD714: its own cluster, secret, Lambdas, and Amplify app.
 */
export class NinesStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    const dbHost = this.requiredContext("dbHost");
    const dbClusterResourceId = this.requiredContext("dbClusterResourceId");

    const appSecret = new secretsmanager.Secret(this, "AppSecret", {
      secretName: "nines/app",
      description: "Nines application configuration (JSON). BETTER_AUTH_SECRET is generated; deploy.sh adds the public URL.",
      generateSecretString: {
        secretStringTemplate: JSON.stringify({}),
        generateStringKey: "BETTER_AUTH_SECRET",
        passwordLength: 48,
        excludePunctuation: true,
      },
    });

    const code = lambda.Code.fromAsset(path.join(__dirname, "../lambda-asset"));
    const commonEnv: Record<string, string> = {
      NODE_ENV: "production",
      APP_SECRET_ARN: appSecret.secretArn,
      DB_IAM_AUTH: "true",
      DB_HOST: dbHost,
      DB_NAME: APP_DATABASE,
      DB_USER: APP_DB_USER,
      DB_PORT: "5432",
      DB_POOL_MAX: "3",
    };

    const api = new lambda.Function(this, "Api", {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "lambda.handler",
      code,
      architecture: lambda.Architecture.X86_64,
      memorySize: 1536,
      timeout: cdk.Duration.seconds(29),
      environment: commonEnv,
      logGroup: new logs.LogGroup(this, "ApiLogs", {
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
    });

    const migrate = new lambda.Function(this, "Migrate", {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "migrate.handler",
      code,
      architecture: lambda.Architecture.X86_64,
      memorySize: 1024,
      timeout: cdk.Duration.minutes(5),
      environment: {
        ...commonEnv,
        DB_ADMIN_USER: ADMIN_DB_USER,
        PRISMA_SCHEMA_ENGINE_BINARY: "/var/task/node_modules/@prisma/engines/schema-engine-rhel-openssl-3.0.x",
      },
      logGroup: new logs.LogGroup(this, "MigrateLogs", {
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
    });

    appSecret.grantRead(api);
    appSecret.grantRead(migrate);
    api.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["rds-db:connect"],
        resources: [this.dbUserArn(dbClusterResourceId, APP_DB_USER)],
      }),
    );
    migrate.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["rds-db:connect"],
        resources: [this.dbUserArn(dbClusterResourceId, APP_DB_USER), this.dbUserArn(dbClusterResourceId, ADMIN_DB_USER)],
      }),
    );

    const accessLogs = new logs.LogGroup(this, "ApiAccessLogs", {
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    accessLogs.grantWrite(new iam.ServicePrincipal("apigateway.amazonaws.com"));

    const httpApi = new apigwv2.CfnApi(this, "HttpApi", {
      name: "nines-api",
      protocolType: "HTTP",
    });
    const integration = new apigwv2.CfnIntegration(this, "ApiIntegration", {
      apiId: httpApi.ref,
      integrationType: "AWS_PROXY",
      integrationUri: api.functionArn,
      payloadFormatVersion: "2.0",
      timeoutInMillis: 30000,
    });
    new apigwv2.CfnRoute(this, "ApiRoute", {
      apiId: httpApi.ref,
      routeKey: "$default",
      target: `integrations/${integration.ref}`,
    });
    new apigwv2.CfnStage(this, "ApiStage", {
      apiId: httpApi.ref,
      stageName: "$default",
      autoDeploy: true,
      defaultRouteSettings: { throttlingRateLimit: 50, throttlingBurstLimit: 100 },
      accessLogSettings: {
        destinationArn: accessLogs.logGroupArn,
        format: JSON.stringify({
          requestId: "$context.requestId",
          ip: "$context.identity.sourceIp",
          requestTime: "$context.requestTime",
          method: "$context.httpMethod",
          path: "$context.path",
          status: "$context.status",
          responseLength: "$context.responseLength",
          integrationError: "$context.integrationErrorMessage",
        }),
      },
    });
    api.addPermission("ApiGatewayInvoke", {
      principal: new iam.ServicePrincipal("apigateway.amazonaws.com"),
      sourceArn: `arn:${this.partition}:execute-api:${this.region}:${this.account}:${httpApi.ref}/*/*`,
    });
    const apiUrl = `https://${httpApi.ref}.execute-api.${this.region}.amazonaws.com`;

    // Static hosting. "/api/*" is proxied to the API so the browser sees one origin and the session cookie stays first-party.
    const amplifyApp = new amplify.CfnApp(this, "Frontend", {
      name: "nines",
      platform: "WEB",
      customRules: [
        { source: "/api/<*>", target: `${apiUrl}/api/<*>`, status: "200" },
        {
          source: "</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>",
          target: "/index.html",
          status: "200",
        },
      ],
      customHeaders: [
        "customHeaders:",
        "  - pattern: '**'",
        "    headers:",
        "      - key: Strict-Transport-Security",
        "        value: max-age=31536000; includeSubDomains",
        "      - key: X-Content-Type-Options",
        "        value: nosniff",
        "      - key: X-Frame-Options",
        "        value: DENY",
        "      - key: Referrer-Policy",
        "        value: strict-origin-when-cross-origin",
      ].join("\n"),
    });
    const branch = new amplify.CfnBranch(this, "FrontendMain", {
      appId: amplifyApp.attrAppId,
      branchName: "main",
      stage: "PRODUCTION",
      enableAutoBuild: false,
    });

    new cdk.CfnOutput(this, "AppUrl", { value: `https://${branch.branchName}.${amplifyApp.attrDefaultDomain}` });
    new cdk.CfnOutput(this, "AmplifyAppId", { value: amplifyApp.attrAppId });
    new cdk.CfnOutput(this, "ApiUrl", { value: apiUrl });
    new cdk.CfnOutput(this, "SecretArn", { value: appSecret.secretArn });
    new cdk.CfnOutput(this, "MigrateFunction", { value: migrate.functionName });
    new cdk.CfnOutput(this, "ApiFunction", { value: api.functionName });
  }

  private dbUserArn(clusterResourceId: string, user: string): string {
    return `arn:${this.partition}:rds-db:${this.region}:${this.account}:dbuser:${clusterResourceId}/${user}`;
  }

  private requiredContext(key: string): string {
    const value = this.node.tryGetContext(key);
    if (typeof value !== "string" || !value) {
      throw new Error(`Missing CDK context "${key}". Run infra/scripts/create-database.sh, then pass -c ${key}=...`);
    }
    return value;
  }
}
