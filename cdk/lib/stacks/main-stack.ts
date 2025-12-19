import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EcrStack } from './ecr-stack';
import { CognitoStack } from './cognito-stack';
import { AgentCoreStack } from './agentcore-stack';
import { CloudFrontStack } from './cloudfront-stack';

export class MainStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Deploy ECR stack first (repository for Docker images)
        const ecrStack = new EcrStack(this, 'EcrStack', props);

        // Deploy Cognito stack (can be deployed independently)
        new CognitoStack(this, 'CognitoStack', props);

        // Deploy AgentCore stack
        // This will automatically build and push the Docker image to the ECR repository
        const agentCoreStack = new AgentCoreStack(this, 'AgentCoreStack', {
            ...props,
            repository: ecrStack.ecrConstruct.repository,
        });
        agentCoreStack.addDependency(ecrStack);

        // Deploy CloudFront stack (can be deployed independently)
        new CloudFrontStack(this, 'CloudFrontStack', props);
    }
}
