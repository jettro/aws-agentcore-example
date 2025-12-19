import { Construct } from 'constructs';
import * as path from 'path';
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

        // Create Bedrock AgentCore Runtime with public network configuration
        this.runtime = new agentcore.Runtime(this, 'Runtime', {
            runtimeName: props.runtimeName,
            agentRuntimeArtifact: agentRuntimeArtifact,
            networkConfiguration: agentcore.RuntimeNetworkConfiguration.usingPublicNetwork(),
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
    }
}
