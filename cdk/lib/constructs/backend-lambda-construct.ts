import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as path from 'path';
import { DockerImageAsset, Platform } from 'aws-cdk-lib/aws-ecr-assets';

export interface BackendLambdaConstructProps {
    cognitoUserPoolId: string;
    agentCoreEndpoint: string;
    agentCoreRuntimeArn: string;
    memorySize?: number;
    timeout?: cdk.Duration;
}

export class BackendLambdaConstruct extends Construct {
    public readonly lambdaFunction: lambda.Function;

    constructor(scope: Construct, id: string, props: BackendLambdaConstructProps) {
        super(scope, id);

        // Build Docker image for Java Lambda
        const dockerImageAsset = new DockerImageAsset(this, 'BackendLambdaImage', {
            directory: path.join(__dirname, '../../../backend-lambda'),
            platform: Platform.LINUX_AMD64,
        });

        // Create Lambda function from Docker image (uses standard Java runtime)
        this.lambdaFunction = new lambda.DockerImageFunction(this, 'BackendLambdaFunction', {
            code: lambda.DockerImageCode.fromEcr(
                ecr.Repository.fromRepositoryArn(
                    this,
                    'BackendImageRepo',
                    dockerImageAsset.repository.repositoryArn
                ),
                {
                    tagOrDigest: dockerImageAsset.imageTag,
                }
            ),
            functionName: 'agentcore-backend-api',
            description: 'Spring Boot Lambda for AgentCore Runtime API',
            memorySize: props.memorySize || 1024, // Standard Java needs more memory than native
            timeout: props.timeout || cdk.Duration.seconds(60),
            architecture: lambda.Architecture.X86_64,
            environment: {
                COGNITO_USER_POOL_ID: props.cognitoUserPoolId,
                AGENTCORE_RUNTIME_ENDPOINT: props.agentCoreEndpoint,
                SPRING_CLOUD_FUNCTION_DEFINITION: 'agentFunction',
                AGENTCORE_RUNTIME_ARN: props.agentCoreRuntimeArn,
            },
            logRetention: logs.RetentionDays.ONE_WEEK,
        });

        // Grant permissions to invoke AgentCore Runtime
        this.lambdaFunction.addToRolePolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'bedrock-agentcore:InvokeAgentRuntime',
                    'bedrock-agentcore:InvokeAgentRuntimeForUser',
                ],
                resources: ['*'], // TODO: Restrict to specific AgentCore Runtime ARN
            })
        );

        // Add CloudWatch Logs permissions (already included but making explicit)
        this.lambdaFunction.addToRolePolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'logs:CreateLogGroup',
                    'logs:CreateLogStream',
                    'logs:PutLogEvents',
                ],
                resources: ['*'],
            })
        );

        // Output Lambda function ARN
        new cdk.CfnOutput(this, 'LambdaFunctionArn', {
            value: this.lambdaFunction.functionArn,
            description: 'Backend Lambda Function ARN',
            exportName: 'BackendLambdaFunctionArn',
        });

        new cdk.CfnOutput(this, 'LambdaFunctionName', {
            value: this.lambdaFunction.functionName,
            description: 'Backend Lambda Function Name',
            exportName: 'BackendLambdaFunctionName',
        });
    }
}
