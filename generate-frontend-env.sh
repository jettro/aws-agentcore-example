#!/bin/bash
# Generate frontend .env.local from CloudFormation stack outputs

set -e

echo "🔍 Fetching stack outputs from CloudFormation..."

# Get Cognito outputs
COGNITO_STACK="BedrockAgentCoreStackCognitoStack4046D002"
USER_POOL_ID=$(aws cloudformation describe-stacks \
    --stack-name $COGNITO_STACK \
    --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
    --output text)

CLIENT_ID=$(aws cloudformation describe-stacks \
    --stack-name $COGNITO_STACK \
    --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' \
    --output text)

DOMAIN=$(aws cloudformation describe-stacks \
    --stack-name $COGNITO_STACK \
    --query 'Stacks[0].Outputs[?OutputKey==`UserPoolDomain`].OutputValue' \
    --output text)

# Get region from User Pool ID
REGION=$(echo $USER_POOL_ID | cut -d'_' -f1)
COGNITO_DOMAIN="$DOMAIN.auth.$REGION.amazoncognito.com"

# Get API Gateway outputs
API_STACK="BedrockAgentCoreStackApiStack1D492081"
API_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name $API_STACK \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayConstructApiGatewayUrlE34CBB66`].OutputValue' \
    --output text)

# Get CloudFront outputs
CLOUDFRONT_STACK="BedrockAgentCoreStackCloudFrontStack19CC240C"
CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
    --stack-name $CLOUDFRONT_STACK \
    --query 'Stacks[0].Outputs[?OutputKey==`FrontendUrl`].OutputValue' \
    --output text)

# Validate we got all values
if [ -z "$USER_POOL_ID" ] || [ -z "$CLIENT_ID" ] || [ -z "$DOMAIN" ] || [ -z "$API_ENDPOINT" ] || [ -z "$CLOUDFRONT_URL" ]; then
    echo "❌ Error: Failed to retrieve all stack outputs"
    echo "   User Pool ID: $USER_POOL_ID"
    echo "   Client ID: $CLIENT_ID"
    echo "   Domain: $DOMAIN"
    echo "   API Endpoint: $API_ENDPOINT"
    echo "   CloudFront URL: $CLOUDFRONT_URL"
    exit 1
fi

# Generate .env.local
ENV_FILE="frontend/.env.local"
cat > $ENV_FILE << EOF
# Auto-generated from CloudFormation stack outputs
# Run './generate-frontend-env.sh' to regenerate

# Cognito Configuration
VITE_COGNITO_USER_POOL_ID=$USER_POOL_ID
VITE_COGNITO_CLIENT_ID=$CLIENT_ID
VITE_COGNITO_DOMAIN=$COGNITO_DOMAIN

# API Configuration
VITE_API_ENDPOINT=$API_ENDPOINT

# App URL - CloudFront URL
VITE_APP_URL=$CLOUDFRONT_URL
EOF

echo ""
echo "✅ Successfully generated $ENV_FILE"
echo ""
echo "📋 Configuration:"
echo "   User Pool ID: $USER_POOL_ID"
echo "   Client ID: $CLIENT_ID"
echo "   Cognito Domain: $COGNITO_DOMAIN"
echo "   API Endpoint: $API_ENDPOINT"
echo "   CloudFront URL: $CLOUDFRONT_URL"
echo ""
echo "🚀 Next steps:"
echo "   1. cd frontend"
echo "   2. npm run dev (for local testing)"
echo "   3. npm run build && cd ../cdk && cdk deploy CloudFrontStack (for production)"
