import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CloudFrontDistributionConstruct } from '../constructs/cloudfront-distribution-construct';
import { FrontendDeploymentConstruct } from '../constructs/frontend-deployment-construct';
import * as fs from 'fs';
import * as path from 'path';

export class CloudFrontStack extends cdk.Stack {
    public readonly cloudFrontConstruct: CloudFrontDistributionConstruct;
    public readonly frontendDeployment?: FrontendDeploymentConstruct;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Create CloudFront distribution using construct
        this.cloudFrontConstruct = new CloudFrontDistributionConstruct(
            this,
            'CloudFrontDistributionConstruct'
        );

        // Check if frontend build exists and deploy it
        const frontendDistPath = path.join(__dirname, '../../../frontend/dist');
        if (fs.existsSync(frontendDistPath)) {
            console.log('Frontend build found, deploying to S3...');
            this.frontendDeployment = new FrontendDeploymentConstruct(
                this,
                'FrontendDeploymentConstruct',
                {
                    bucket: this.cloudFrontConstruct.bucket,
                    distribution: this.cloudFrontConstruct.distribution,
                }
            );
        } else {
            console.log('No frontend build found at', frontendDistPath);
            console.log('Run "cd frontend && npm run build" to build the frontend before deploying.');
        }

        // Export CloudFront domain name and bucket name
        new cdk.CfnOutput(this, 'DistributionDomainName', {
            value: this.cloudFrontConstruct.distribution.distributionDomainName,
            description: 'CloudFront Distribution Domain Name',
            exportName: 'BedrockAgentDistributionDomain',
        });

        new cdk.CfnOutput(this, 'ContentBucketName', {
            value: this.cloudFrontConstruct.bucket.bucketName,
            description: 'S3 Content Bucket Name',
            exportName: 'BedrockAgentContentBucket',
        });

        new cdk.CfnOutput(this, 'FrontendUrl', {
            value: `https://${this.cloudFrontConstruct.distribution.distributionDomainName}`,
            description: 'Frontend Application URL',
            exportName: 'FrontendApplicationUrl',
        });
    }
}
