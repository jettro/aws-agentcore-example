import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BackendLambdaConstruct } from '../constructs/backend-lambda-construct';
import { ApiGatewayConstruct } from '../constructs/api-gateway-construct';

export interface ApiStackProps extends cdk.StackProps {
    cognitoUserPoolId: string;
    agentCoreRuntimeArn: string;
}

export class ApiStack extends cdk.Stack {
    public readonly lambdaConstruct: BackendLambdaConstruct;
    public readonly apiGatewayConstruct: ApiGatewayConstruct;

    constructor(scope: Construct, id: string, props: ApiStackProps) {
        super(scope, id, props);

        // Construct AgentCore Runtime endpoint from ARN
        // ARN format: arn:aws:bedrock-agentcore:region:account:runtime/runtime-name
        const agentCoreEndpoint = this.constructAgentCoreEndpoint(
            props.agentCoreRuntimeArn,
            this.region
        );

        // Create Backend Lambda
        this.lambdaConstruct = new BackendLambdaConstruct(this, 'BackendLambdaConstruct', {
            cognitoUserPoolId: props.cognitoUserPoolId,
            agentCoreEndpoint: agentCoreEndpoint,
            memorySize: 512, // GraalVM native image - minimal memory
            timeout: cdk.Duration.seconds(60),
        });

        // Create API Gateway
        this.apiGatewayConstruct = new ApiGatewayConstruct(this, 'ApiGatewayConstruct', {
            lambdaFunction: this.lambdaConstruct.lambdaFunction,
            stageName: 'prod',
        });

        // Output the complete API endpoint for frontend configuration
        new cdk.CfnOutput(this, 'FrontendApiEndpoint', {
            value: this.apiGatewayConstruct.apiUrl,
            description: 'API Endpoint for React Frontend',
            exportName: 'FrontendApiEndpoint',
        });
    }

    /**
     * Constructs the AgentCore Runtime HTTPS endpoint from the ARN
     * Format: https://bedrock-agentcore.{region}.amazonaws.com/runtimes/{runtime-arn}/invocations
     */
    private constructAgentCoreEndpoint(runtimeArn: string, region: string): string {
        // URL encode the ARN (colons become %3A, slashes become %2F)
        const encodedArn = encodeURIComponent(runtimeArn);
        return `https://bedrock-agentcore.${region}.amazonaws.com/runtimes/${encodedArn}/invocations`;
    }
}
