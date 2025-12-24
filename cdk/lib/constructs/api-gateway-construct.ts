import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface ApiGatewayConstructProps {
    lambdaFunction: lambda.IFunction;
    stageName?: string;
}

export class ApiGatewayConstruct extends Construct {
    public readonly api: apigateway.RestApi;
    public readonly apiUrl: string;

    constructor(scope: Construct, id: string, props: ApiGatewayConstructProps) {
        super(scope, id);

        // Create REST API
        this.api = new apigateway.RestApi(this, 'BackendApi', {
            restApiName: 'AgentCore Backend API',
            description: 'API Gateway for AgentCore Backend Lambda',
            deployOptions: {
                stageName: props.stageName || 'prod',
                // All logging disabled (requires account-level CloudWatch role setup)
                // Can be enabled after setting up CloudWatch role via AWS Console or CLI
                metricsEnabled: true,
            },
            defaultCorsPreflightOptions: {
                allowOrigins: apigateway.Cors.ALL_ORIGINS, // TODO: Restrict in production
                allowMethods: apigateway.Cors.ALL_METHODS,
                allowHeaders: [
                    'Content-Type',
                    'Authorization',
                    'X-Amz-Date',
                    'X-Api-Key',
                    'X-Amz-Security-Token',
                ],
                allowCredentials: true,
            },
        });

        // Create Lambda integration
        const lambdaIntegration = new apigateway.LambdaIntegration(props.lambdaFunction, {
            proxy: true,
            integrationResponses: [
                {
                    statusCode: '200',
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': "'*'",
                    },
                },
            ],
        });

        // Create /agent resource
        const agentResource = this.api.root.addResource('agent');

        // Create /agent/invoke endpoint
        const invokeResource = agentResource.addResource('invoke');
        invokeResource.addMethod('POST', lambdaIntegration, {
            authorizationType: apigateway.AuthorizationType.NONE, // Auth handled by Lambda
            methodResponses: [
                {
                    statusCode: '200',
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': true,
                    },
                },
                {
                    statusCode: '400',
                },
                {
                    statusCode: '401',
                },
                {
                    statusCode: '500',
                },
            ],
        });

        // Store API URL
        this.apiUrl = this.api.url;

        // Output API Gateway URL
        new cdk.CfnOutput(this, 'ApiGatewayUrl', {
            value: this.apiUrl,
            description: 'API Gateway Endpoint URL',
            exportName: 'BackendApiGatewayUrl',
        });

        new cdk.CfnOutput(this, 'ApiGatewayInvokeUrl', {
            value: `${this.apiUrl}agent/invoke`,
            description: 'API Gateway Invoke Endpoint',
            exportName: 'BackendApiInvokeEndpoint',
        });

        new cdk.CfnOutput(this, 'ApiGatewayId', {
            value: this.api.restApiId,
            description: 'API Gateway ID',
            exportName: 'BackendApiGatewayId',
        });
    }
}
