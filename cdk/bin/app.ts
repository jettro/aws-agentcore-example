#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MainStack } from '../lib/stacks/main-stack';

const app = new cdk.App();

// Get AWS account and region from environment or use defaults
const account = process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID;
const region = process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || 'us-east-1';

// Create the main stack which orchestrates all nested stacks
new MainStack(app, 'BedrockAgentCoreStack', {
    env: {
        account: account,
        region: region,
    },
    description: 'AWS Bedrock AgentCore infrastructure with Cognito, ECR, CloudFront, and Agent Runtime',
});

app.synth();
