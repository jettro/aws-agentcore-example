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
        // Strategy IDs can be provided via environment variables if not available from construct
        this.agentCoreConstruct = new AgentCoreRuntimeConstruct(
            this,
            'AgentCoreRuntimeConstruct',
            {
                repository: props.repository,
                dockerfilePath: dockerfilePath,
                runtimeName: 'bedrock_agent_runtime',
                memoryId: this.memoryConstruct.memoryId,
                summarizationStrategyId: process.env.SUMMARIZATION_STRATEGY_ID || this.memoryConstruct.summarizationStrategyId || undefined,
                semanticStrategyId: process.env.SEMANTIC_STRATEGY_ID || this.memoryConstruct.semanticStrategyId || undefined,
                userPreferenceStrategyId: process.env.USER_PREFERENCE_STRATEGY_ID || this.memoryConstruct.userPreferenceStrategyId || undefined,
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

        // Export individual memory strategy IDs (if available)
        // Currently disabled until AWS SDK supports BedrockAgentCoreControl in Lambda
        if (this.memoryConstruct.summarizationStrategyId) {
            new cdk.CfnOutput(this, 'SummarizationStrategyId', {
                value: this.memoryConstruct.summarizationStrategyId,
                description: 'Summarization Memory Strategy ID',
                exportName: 'BedrockAgentSummarizationStrategyId',
            });
        }

        if (this.memoryConstruct.semanticStrategyId) {
            new cdk.CfnOutput(this, 'SemanticStrategyId', {
                value: this.memoryConstruct.semanticStrategyId,
                description: 'Semantic Memory Strategy ID',
                exportName: 'BedrockAgentSemanticStrategyId',
            });
        }

        if (this.memoryConstruct.userPreferenceStrategyId) {
            new cdk.CfnOutput(this, 'UserPreferenceStrategyId', {
                value: this.memoryConstruct.userPreferenceStrategyId,
                description: 'User Preference Memory Strategy ID',
                exportName: 'BedrockAgentUserPreferenceStrategyId',
            });
        }
    }
}
