import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as path from 'path';

export interface FrontendDeploymentConstructProps {
    bucket: s3.IBucket;
    distribution: cloudfront.IDistribution;
    sourcePath?: string;
}

export class FrontendDeploymentConstruct extends Construct {
    public readonly deployment: s3deploy.BucketDeployment;

    constructor(scope: Construct, id: string, props: FrontendDeploymentConstructProps) {
        super(scope, id);

        const distPath = props.sourcePath || path.join(__dirname, '../../../frontend/dist');

        // Deploy React build to S3 and invalidate CloudFront cache
        this.deployment = new s3deploy.BucketDeployment(this, 'FrontendDeployment', {
            sources: [
                s3deploy.Source.asset(distPath)
            ],
            destinationBucket: props.bucket,
            distribution: props.distribution,
            distributionPaths: ['/*'], // Invalidate all cached files
            prune: true, // Remove old files that are no longer in the build
        });
    }
}
