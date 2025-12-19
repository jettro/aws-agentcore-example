import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CloudFrontDistributionConstruct } from '../constructs/cloudfront-distribution-construct';

export class CloudFrontStack extends cdk.Stack {
    public readonly cloudFrontConstruct: CloudFrontDistributionConstruct;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Create CloudFront distribution using construct
        this.cloudFrontConstruct = new CloudFrontDistributionConstruct(
            this,
            'CloudFrontDistributionConstruct'
        );

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
    }
}
