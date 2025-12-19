import { Construct } from 'constructs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { RemovalPolicy } from 'aws-cdk-lib';

export interface EcrRepositoryConstructProps {
    repositoryName: string;
}

export class EcrRepositoryConstruct extends Construct {
    public readonly repository: ecr.Repository;

    constructor(scope: Construct, id: string, props: EcrRepositoryConstructProps) {
        super(scope, id);

        // Create ECR repository for agent runtime images
        this.repository = new ecr.Repository(this, 'Repository', {
            repositoryName: props.repositoryName,
            imageScanOnPush: true,
            removalPolicy: RemovalPolicy.DESTROY, // Change to RETAIN for production
            emptyOnDelete: true, // Change to false for production
            lifecycleRules: [
                {
                    description: 'Keep last 10 images',
                    maxImageCount: 10,
                }
            ],
        });
    }
}
