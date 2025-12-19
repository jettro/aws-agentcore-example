import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as path from 'path';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { AgentCoreRuntimeConstruct } from '../constructs/agentcore-runtime-construct';

export interface AgentCoreStackProps extends cdk.StackProps {
    repository: ecr.Repository;
}

export class AgentCoreStack extends cdk.Stack {
    public readonly agentCoreConstruct: AgentCoreRuntimeConstruct;

    constructor(scope: Construct, id: string, props: AgentCoreStackProps) {
        super(scope, id, props);

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
    }
}
