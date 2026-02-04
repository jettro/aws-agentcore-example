import { Construct } from 'constructs';
import * as agentcore from '@aws-cdk/aws-bedrock-agentcore-alpha';
import * as cdk from 'aws-cdk-lib';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';

export interface AgentCoreMemoryConstructProps {
    memoryName: string;
    description?: string;
    expirationDays?: number;
}

export class AgentCoreMemoryConstruct extends Construct {
    public readonly memory: agentcore.Memory;
    public readonly memoryId: string;
    public readonly memoryArn: string;
    public readonly summarizationStrategyId?: string;
    public readonly semanticStrategyId?: string;
    public readonly userPreferenceStrategyId?: string;

    constructor(scope: Construct, id: string, props: AgentCoreMemoryConstructProps) {
        super(scope, id);

        // Create memory with all built-in strategies
        // - Summarization: Short-term memory for conversation context
        // - Semantic: Long-term memory for factual knowledge
        // - User Preference: Long-term memory for user behavior patterns
        this.memory = new agentcore.Memory(this, 'Memory', {
            memoryName: props.memoryName,
            description: props.description || `AgentCore memory for ${props.memoryName}`,
            expirationDuration: cdk.Duration.days(props.expirationDays || 90),
            memoryStrategies: [
                // Short-term: Compresses conversations into concise overviews
                agentcore.MemoryStrategy.usingBuiltInSummarization(),
                
                // Long-term: Distills general facts and concepts
                agentcore.MemoryStrategy.usingBuiltInSemantic(),
                
                // Long-term: Captures user preferences and patterns
                agentcore.MemoryStrategy.usingBuiltInUserPreference(),

                // Long-term: Captures episodic memories
                // agentcore.MemoryStrategy.usingBuiltInEpisodic(),
            ],
        });

        // Extract memory ID and ARN for use in the application
        this.memoryId = this.memory.memoryId;
        this.memoryArn = this.memory.memoryArn;

        // NOTE: Retrieving strategy IDs at deploy time currently isn't possible via AwsCustomResource
        // because the AWS SDK for JavaScript does not yet include a client/package for
        // 'BedrockAgentCoreControl'. Attempting to use it results in the deployment error:
        // "Package @aws-sdk/client-bedrockagentcorecontrol does not exist."
        //
        // As a result, we leave the strategy IDs undefined at deploy time. If the application needs
        // them, fetch them at runtime using the Bedrock AgentCore GetMemory API from the runtime
        // with the execution role permissions already granted in AgentCoreRuntimeConstruct.
        this.summarizationStrategyId = undefined;
        this.semanticStrategyId = undefined;
        this.userPreferenceStrategyId = undefined;
    }
}
