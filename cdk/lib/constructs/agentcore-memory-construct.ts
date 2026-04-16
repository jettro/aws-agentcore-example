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
    }
}
