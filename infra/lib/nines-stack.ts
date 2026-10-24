import path from "node:path";
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as rds from "aws-cdk-lib/aws-rds";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";

/**
 * Sketch of the AWS shape described in the README: a private Aurora PostgreSQL
 * cluster, a Lambda for the API, a Lambda that would run migrations, and an
 * HTTP API in front. The Lambda code here is a placeholder. Wiring the Nest
 * app through a serverless adapter, Amplify hosting, and a private migration
 * path is left for a later deploy.
 */
export class NinesStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        { name: "public", subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
        { name: "private", subnetType: ec2.SubnetType.PRIVATE_ISOLATED, cidrMask: 24 },
      ],
    });

    const cluster = new rds.DatabaseCluster(this, "Aurora", {
      engine: rds.DatabaseClusterEngine.auroraPostgres({ version: rds.AuroraPostgresEngineVersion.VER_16_4 }),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      writer: rds.ClusterInstance.serverlessV2("writer"),
      serverlessV2MinCapacity: 0,
      serverlessV2MaxCapacity: 2,
      defaultDatabaseName: "nines",
      credentials: rds.Credentials.fromGeneratedSecret("nines"),
      deletionProtection: false,
    });

    const code = lambda.Code.fromAsset(path.join(__dirname, "../lambda"));
    const migrateFn = new lambda.Function(this, "Migrate", {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "index.handler",
      code,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      environment: { MODE: "migrate" },
    });
    const apiFn = new lambda.Function(this, "Api", {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "index.handler",
      code,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
      environment: { MODE: "api" },
    });

    cluster.connections.allowDefaultPortFrom(migrateFn);
    cluster.connections.allowDefaultPortFrom(apiFn);

    const httpApi = new apigwv2.HttpApi(this, "HttpApi", { apiName: "nines" });
    httpApi.addRoutes({
      path: "/{proxy+}",
      methods: [apigwv2.HttpMethod.ANY],
      integration: new integrations.HttpLambdaIntegration("ApiIntegration", apiFn),
    });

    new cdk.CfnOutput(this, "ApiUrl", { value: httpApi.apiEndpoint });
    new cdk.CfnOutput(this, "MigrateFunctionName", { value: migrateFn.functionName });
  }
}
