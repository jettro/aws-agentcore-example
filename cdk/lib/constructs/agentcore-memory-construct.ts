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
            ],
        });

        // Extract memory ID and ARN for use in the application
        this.memoryId = this.memory.memoryId;
        this.memoryArn = this.memory.memoryArn;

        // TEMPORARILY DISABLED: Custom resource to retrieve memory strategy IDs
        // The AWS SDK for BedrockAgentCoreControl is not yet available in Lambda runtimes
        // Uncomment this section once the SDK package is available
        /*
        const getMemoryStrategies = new cr.AwsCustomResource(this, 'GetMemoryStrategies', {
            onCreate: {
                service: 'BedrockAgentCoreControl',
                action: 'getMemory',
                parameters: {
                    memoryId: this.memoryId,
                },
                physicalResourceId: cr.PhysicalResourceId.of(`${this.memoryId}-strategies`),
            },
            onUpdate: {
                service: 'BedrockAgentCoreControl',
                action: 'getMemory',
                parameters: {
                    memoryId: this.memoryId,
                },
                physicalResourceId: cr.PhysicalResourceId.of(`${this.memoryId}-strategies`),
            },
            policy: cr.AwsCustomResourcePolicy.fromStatements([
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['bedrock-agentcore:GetMemory'],
                    resources: [this.memoryArn],
                }),
            ]),
            logGroup: new logs.LogGroup(this, 'GetMemoryStrategiesLogGroup', {
                retention: logs.RetentionDays.ONE_DAY,
                removalPolicy: cdk.RemovalPolicy.DESTROY,
            }),
            // Note: This service is very new and might not be in the SDK yet
            // If deployment fails, this can be commented out temporarily
            installLatestAwsSdk: true,
            timeout: cdk.Duration.minutes(2),
        });

        // Ensure the custom resource runs after the memory is created
        getMemoryStrategies.node.addDependency(this.memory);

        // Extract strategy IDs from the response
        // The response structure is: { memory: { memoryStrategies: [{ name, id, ... }] } }
        // Find each strategy by name and extract its ID
        this.summarizationStrategyId = getMemoryStrategies.getResponseField('memory.memoryStrategies.0.id');
        this.semanticStrategyId = getMemoryStrategies.getResponseField('memory.memoryStrategies.1.id');
        this.userPreferenceStrategyId = getMemoryStrategies.getResponseField('memory.memoryStrategies.2.id');
        */
       
        // Strategy IDs are not available until custom resource is enabled
        // For now, the LongTermMemoryProvider can load strategies dynamically using GetMemory API
        this.summarizationStrategyId = undefined;
        this.semanticStrategyId = undefined;
        this.userPreferenceStrategyId = undefined;
    }
}
