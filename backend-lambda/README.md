# Backend Lambda Service

Spring Boot 4 application running on AWS Lambda Java 21 runtime, providing a secure API gateway to the AgentCore Runtime.

## Architecture

- **Framework**: Spring Boot 4 with Spring Cloud Function
- **Runtime**: AWS Lambda Java 21
- **Authentication**: JWT token validation against Amazon Cognito

## Features

- JWT token validation using Cognito JWKS
- Secure proxy to AgentCore Runtime
- CORS support for web frontend
- User ID extraction and forwarding
- Comprehensive error handling

## API Endpoints

### POST /invoke
Invokes the AgentCore Runtime with user's prompt.

**Request**:
```json
{
  "prompt": "Tell me a joke",
  "sessionId": "optional-session-id"
}
```

**Headers**:
- `Authorization: Bearer <cognito-jwt-token>`
- `Content-Type: application/json`

**Response**:
```json
{
  "response": "Agent response text",
  "sessionId": "session-id",
  "userId": "cognito-user-sub"
}
```

## Environment Variables

Required environment variables for Lambda:

- `AWS_REGION` - AWS region (e.g., eu-west-1)
- `COGNITO_USER_POOL_ID` - Cognito User Pool ID
- `AGENTCORE_RUNTIME_ENDPOINT` - AgentCore Runtime HTTPS endpoint

## Local Development

### Prerequisites

- Java 21
- Maven 3.9+
- Docker

### Build JAR

```bash
mvn clean package
```

### Build Docker Image

```bash
docker build -t backend-lambda .
```

### Test Locally

You can test the function locally using Spring Boot:

```bash
# Set environment variables
export AWS_REGION=eu-west-1
export COGNITO_USER_POOL_ID=your-user-pool-id
export AGENTCORE_RUNTIME_ENDPOINT=https://...

# Run Spring Boot
mvn spring-boot:run
```

## Deployment

The Lambda function is deployed via CDK. The CDK stack will:

1. Build the Docker image
2. Push to ECR
3. Create Lambda function with Java 21 runtime
4. Configure API Gateway integration
5. Set environment variables from CDK context

See `../cdk/lib/stacks/api-stack.ts` for deployment configuration.

## Testing

### Unit Tests

```bash
mvn test
```

### Integration Tests

Test with actual Cognito tokens and AgentCore Runtime (requires deployed infrastructure):

```bash
# Get a Cognito token
TOKEN=$(aws cognito-idp initiate-auth ...)

# Test the function
curl -X POST https://your-api-gateway-url/invoke \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello, agent!"}'
```

## Troubleshooting

### Token Validation Fails

- Verify Cognito User Pool ID is correct
- Check AWS region matches Cognito region
- Ensure token is not expired
- Verify JWKS endpoint is accessible

### AgentCore Connection Fails

- Check AgentCore Runtime endpoint URL
- Verify Lambda has network access to AgentCore
- Ensure bearer token is passed correctly
- Check CloudWatch logs for detailed errors

## License

This is part of the aws-agentcore-example project.
