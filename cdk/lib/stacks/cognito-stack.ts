import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CognitoUserPoolConstruct } from '../constructs/cognito-userpool-construct';

export class CognitoStack extends cdk.Stack {
    public readonly cognitoConstruct: CognitoUserPoolConstruct;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Create Cognito User Pool using construct
        this.cognitoConstruct = new CognitoUserPoolConstruct(this, 'CognitoUserPoolConstruct');

        // Export User Pool ID and Client ID
        new cdk.CfnOutput(this, 'UserPoolId', {
            value: this.cognitoConstruct.userPoolId,
            description: 'Cognito User Pool ID',
            exportName: 'BedrockAgentUserPoolId',
        });

        new cdk.CfnOutput(this, 'UserPoolClientId', {
            value: this.cognitoConstruct.userPoolClientId,
            description: 'Cognito User Pool Client ID',
            exportName: 'BedrockAgentUserPoolClientId',
        });
    }
}
