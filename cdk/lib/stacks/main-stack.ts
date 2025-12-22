import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EcrStack } from './ecr-stack';
import { CognitoStack } from './cognito-stack';
import { AgentCoreStack } from './agentcore-stack';
import { CloudFrontStack } from './cloudfront-stack';
import { ApiStack } from './api-stack';

export class MainStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Deploy ECR stack first (repository for Docker images)
        const ecrStack = new EcrStack(this, 'EcrStack', props);

        // Deploy Cognito stack (can be deployed independently)
        const cognitoStack = new CognitoStack(this, 'CognitoStack', props);

        // Deploy AgentCore stack with OAuth configuration
        // This will automatically build and push the Docker image to the ECR repository
        const agentCoreStack = new AgentCoreStack(this, 'AgentCoreStack', {
            ...props,
            repository: ecrStack.ecrConstruct.repository,
            cognitoUserPoolId: cognitoStack.cognitoConstruct.userPoolId,
            cognitoClientId: cognitoStack.cognitoConstruct.userPoolClientId,
        });
        agentCoreStack.addDependency(ecrStack);
        agentCoreStack.addDependency(cognitoStack);

        // Deploy API Stack (Backend Lambda + API Gateway)
        const apiStack = new ApiStack(this, 'ApiStack', {
            ...props,
            cognitoUserPoolId: cognitoStack.cognitoConstruct.userPoolId,
            agentCoreRuntimeArn: agentCoreStack.agentCoreConstruct.runtime.agentRuntimeArn,
        });
        apiStack.addDependency(cognitoStack);
        apiStack.addDependency(agentCoreStack);

        // Deploy CloudFront stack (can be deployed independently)
        new CloudFrontStack(this, 'CloudFrontStack', props);
    }
}
