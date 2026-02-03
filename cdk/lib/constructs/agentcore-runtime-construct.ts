import { Construct } from 'constructs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as imagedeploy from 'cdk-docker-image-deployment';
import * as agentcore from '@aws-cdk/aws-bedrock-agentcore-alpha';
import * as cdk from 'aws-cdk-lib';

export interface AgentCoreRuntimeConstructProps {
    repository: ecr.Repository;
    runtimeName: string;
    dockerfilePath: string;
    imageTag?: string;
    memoryId?: string;
    summarizationStrategyId?: string;
    semanticStrategyId?: string;
    userPreferenceStrategyId?: string;
    cognitoUserPoolId?: string;
    cognitoClientId?: string;
}

export class AgentCoreRuntimeConstruct extends Construct {
    public readonly runtime: agentcore.Runtime;
    public readonly imageDeployment: imagedeploy.DockerImageDeployment;

    constructor(scope: Construct, id: string, props: AgentCoreRuntimeConstructProps) {
        super(scope, id);

        const imageTag = props.imageTag || 'latest';

        // Deploy Docker image from directory to your ECR repository
        // This automatically builds and pushes the image to your repository
        this.imageDeployment = new imagedeploy.DockerImageDeployment(this, 'ImageDeployment', {
            source: imagedeploy.Source.directory(props.dockerfilePath),
            destination: imagedeploy.Destination.ecr(props.repository, {
                tag: imageTag,
            }),
        });

        // Create agent runtime artifact from your ECR repository
        const agentRuntimeArtifact = agentcore.AgentRuntimeArtifact.fromEcrRepository(
            props.repository,
            imageTag
        );

        // Create environment variables for the runtime
        const environmentVariables: { [key: string]: string } = {};
        
        // Add memory ID if provided
        if (props.memoryId) {
            environmentVariables['AGENTCORE_MEMORY_ID'] = props.memoryId;
        }
        
        // Add memory strategy IDs if provided
        if (props.summarizationStrategyId) {
            environmentVariables['AGENTCORE_SUMMARIZATION_STRATEGY_ID'] = props.summarizationStrategyId;
        }
        if (props.semanticStrategyId) {
            environmentVariables['AGENTCORE_SEMANTIC_STRATEGY_ID'] = props.semanticStrategyId;
        }
        if (props.userPreferenceStrategyId) {
            environmentVariables['AGENTCORE_USER_PREFERENCE_STRATEGY_ID'] = props.userPreferenceStrategyId;
        }

        // Configure OAuth authorizer if Cognito details are provided
        let authorizerConfig: agentcore.RuntimeAuthorizerConfiguration | undefined;
        if (props.cognitoUserPoolId && props.cognitoClientId) {
            const region = cdk.Stack.of(this).region;
            const discoveryUrl = `https://cognito-idp.${region}.amazonaws.com/${props.cognitoUserPoolId}/.well-known/openid-configuration`;
            
            authorizerConfig = agentcore.RuntimeAuthorizerConfiguration.usingJWT(
                discoveryUrl,
                [props.cognitoClientId]
            );
        }

        // Create Bedrock AgentCore Runtime with public network configuration
        this.runtime = new agentcore.Runtime(this, 'Runtime', {
            runtimeName: props.runtimeName,
            agentRuntimeArtifact: agentRuntimeArtifact,
            networkConfiguration: agentcore.RuntimeNetworkConfiguration.usingPublicNetwork(),
            environmentVariables: Object.keys(environmentVariables).length > 0 ? environmentVariables : undefined,
            authorizerConfiguration: authorizerConfig,
        });

        // Ensure runtime depends on image deployment
        this.runtime.node.addDependency(this.imageDeployment);

        // Grant the runtime execution role permission to pull from the repository
        props.repository.grantPull(this.runtime.grantPrincipal);

        // Add Bedrock permissions for the runtime to invoke models
        this.runtime.role.addToPrincipalPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'bedrock:InvokeModel',
                'bedrock:InvokeModelWithResponseStream',
            ],
            resources: [
                // Allow access to all foundation models in all regions
                'arn:aws:bedrock:*::foundation-model/*',
                // Allow access to inference profiles in this account (all regions)
                `arn:aws:bedrock:*:${cdk.Stack.of(this).account}:inference-profile/*`,
            ],
        }));

        // Add AgentCore Memory permissions if memory ID is provided
        if (props.memoryId) {
            this.runtime.role.addToPrincipalPolicy(new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    // Memory operations
                    'bedrock-agentcore:GetMemory',
                    'bedrock-agentcore:PutMemory',
                    'bedrock-agentcore:DeleteMemory',
                    'bedrock-agentcore:ListMemories',
                    // Event operations
                    'bedrock-agentcore:CreateEvent',
                    'bedrock-agentcore:GetEvent',
                    'bedrock-agentcore:DeleteEvent',
                    'bedrock-agentcore:ListEvents',
                    // Memory record operations
                    'bedrock-agentcore:GetMemoryRecord',
                    'bedrock-agentcore:DeleteMemoryRecord',
                    'bedrock-agentcore:ListMemoryRecords',
                    'bedrock-agentcore:RetrieveMemoryRecords',
                    'bedrock-agentcore:BatchCreateMemoryRecords',
                    'bedrock-agentcore:BatchUpdateMemoryRecords',
                    'bedrock-agentcore:BatchDeleteMemoryRecords',
                    // Memory extraction jobs
                    'bedrock-agentcore:StartMemoryExtractionJob',
                    'bedrock-agentcore:ListMemoryExtractionJobs',
                ],
                resources: [
                    // Allow access to the specific memory
                    `arn:aws:bedrock-agentcore:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:memory/${props.memoryId}`,
                    // Allow access to all memory strategies within this memory
                    `arn:aws:bedrock-agentcore:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:memory/${props.memoryId}/*`,
                ],
            }));
        }
    }
}
