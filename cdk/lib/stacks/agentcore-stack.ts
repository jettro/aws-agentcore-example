import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as path from 'path';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { AgentCoreRuntimeConstruct } from '../constructs/agentcore-runtime-construct';
import { AgentCoreMemoryConstruct } from '../constructs/agentcore-memory-construct';

export interface AgentCoreStackProps extends cdk.StackProps {
    repository: ecr.Repository;
    cognitoUserPoolId?: string;
    cognitoClientId?: string;
}

export class AgentCoreStack extends cdk.Stack {
    public readonly agentCoreConstruct: AgentCoreRuntimeConstruct;
    public readonly memoryConstruct: AgentCoreMemoryConstruct;

    constructor(scope: Construct, id: string, props: AgentCoreStackProps) {
        super(scope, id, props);

        // Create AgentCore Memory with built-in strategies
        this.memoryConstruct = new AgentCoreMemoryConstruct(
            this,
            'AgentCoreMemoryConstruct',
            {
                memoryName: 'bedrock_agent_memory',
                description: 'Memory for Bedrock agent with summarization, semantic, and user preference strategies',
                expirationDays: 90,
            }
        );

        // Path to the agent-java directory containing Dockerfile
        const dockerfilePath = path.join(__dirname, '../../../agent-java');

        // Create AgentCore Runtime using construct
        // This will automatically build and push the Docker image to the ECR repository
        this.agentCoreConstruct = new AgentCoreRuntimeConstruct(
            this,
            'AgentCoreRuntimeConstruct',
            {
                repository: props.repository,
                dockerfilePath: dockerfilePath,
                runtimeName: 'bedrock_agent_runtime',
                memoryId: this.memoryConstruct.memoryId,
                cognitoUserPoolId: props.cognitoUserPoolId,
                cognitoClientId: props.cognitoClientId,
            }
        );

        // Export runtime ARN and image info
        new cdk.CfnOutput(this, 'RuntimeArn', {
            value: this.agentCoreConstruct.runtime.agentRuntimeArn,
            description: 'Bedrock AgentCore Runtime ARN',
            exportName: 'BedrockAgentRuntimeArn',
        });

        new cdk.CfnOutput(this, 'DockerImageUri', {
            value: `${props.repository.repositoryUri}:latest`,
            description: 'Docker image URI in your ECR repository',
        });

        // Export memory information
        new cdk.CfnOutput(this, 'MemoryId', {
            value: this.memoryConstruct.memoryId,
            description: 'AgentCore Memory ID',
            exportName: 'BedrockAgentMemoryId',
        });

        new cdk.CfnOutput(this, 'MemoryArn', {
            value: this.memoryConstruct.memoryArn,
            description: 'AgentCore Memory ARN',
            exportName: 'BedrockAgentMemoryArn',
        });
    }
}
