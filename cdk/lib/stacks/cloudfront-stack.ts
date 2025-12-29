import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';
import { FrontendDeploymentConstruct } from '../constructs/frontend-deployment-construct';
import * as path from 'path';
import * as fs from 'fs';

export interface CloudFrontStackProps extends cdk.StackProps {
    cognitoUserPoolId: string;
    cognitoClientId: string;
    cognitoDomain: string;
    apiEndpoint: string;
    customDomainName?: string;  // e.g., 'agentcore.jettro.dev'
    certificateArn?: string;     // ACM certificate ARN in us-east-1
}

export class CloudFrontStack extends cdk.Stack {
    public readonly bucket: s3.Bucket;
    public readonly distribution: cloudfront.Distribution;
    public readonly frontendDeployment?: FrontendDeploymentConstruct;

    constructor(scope: Construct, id: string, props: CloudFrontStackProps) {
        super(scope, id, props);

        // Create S3 bucket for static content
        this.bucket = new s3.Bucket(this, 'ContentBucket', {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
            enforceSSL: true,
        });

        // Import certificate if ARN provided
        const certificate = props.certificateArn
            ? acm.Certificate.fromCertificateArn(this, 'Certificate', props.certificateArn)
            : undefined;

        // Create CloudFront distribution
        this.distribution = new cloudfront.Distribution(this, 'Distribution', {
            defaultBehavior: {
                origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
            },
            defaultRootObject: 'index.html',
            errorResponses: [
                {
                    httpStatus: 404,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                },
            ],
            // Add custom domain if provided
            domainNames: props.customDomainName ? [props.customDomainName] : undefined,
            certificate: certificate,
        });

        // Deploy frontend if the dist directory exists
        const frontendDistPath = path.join(__dirname, '../../../frontend/dist');
        if (fs.existsSync(frontendDistPath)) {
            console.log('Frontend build found, deploying to S3...');
            this.frontendDeployment = new FrontendDeploymentConstruct(
                this,
                'FrontendDeploymentConstruct',
                {
                    bucket: this.bucket,
                    distribution: this.distribution,
                }
            );
        } else {
            console.warn('Frontend build not found at', frontendDistPath);
            console.warn('Please run "cd frontend && npm run build" before deploying.');
        }

        // Export CloudFront domain name and bucket name
        new cdk.CfnOutput(this, 'DistributionDomainName', {
            value: this.distribution.distributionDomainName,
            description: 'CloudFront Distribution Domain Name',
            exportName: 'BedrockAgentDistributionDomain',
        });

        new cdk.CfnOutput(this, 'ContentBucketName', {
            value: this.bucket.bucketName,
            description: 'S3 Content Bucket Name',
            exportName: 'BedrockAgentContentBucket',
        });

        new cdk.CfnOutput(this, 'FrontendUrl', {
            value: `https://${this.distribution.distributionDomainName}`,
            description: 'Frontend Application URL',
            exportName: 'FrontendApplicationUrl',
        });
    }
}
