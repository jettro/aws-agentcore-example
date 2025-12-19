import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EcrRepositoryConstruct } from '../constructs/ecr-repository-construct';

export class EcrStack extends cdk.Stack {
    public readonly ecrConstruct: EcrRepositoryConstruct;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Create ECR repository using construct
        this.ecrConstruct = new EcrRepositoryConstruct(this, 'EcrRepositoryConstruct', {
            repositoryName: 'bedrock-agent-runtime',
        });

        // Export repository URI and name
        new cdk.CfnOutput(this, 'RepositoryUri', {
            value: this.ecrConstruct.repository.repositoryUri,
            description: 'ECR Repository URI for agent runtime',
            exportName: 'BedrockAgentRepositoryUri',
        });

        new cdk.CfnOutput(this, 'RepositoryName', {
            value: this.ecrConstruct.repository.repositoryName,
            description: 'ECR Repository Name',
            exportName: 'BedrockAgentRepositoryName',
        });
    }
}
