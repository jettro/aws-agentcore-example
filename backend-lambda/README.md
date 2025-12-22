# Backend Lambda Service

Spring Boot 3 application compiled to GraalVM native image for AWS Lambda, providing a secure API gateway to the AgentCore Runtime.

## Architecture

- **Framework**: Spring Boot 3 with Spring Cloud Function
- **Runtime**: GraalVM Native Image (custom Lambda runtime)
- **Authentication**: JWT token validation against Amazon Cognito
- **Cold Start**: ~200-500ms (vs 3-8s for JVM)
- **Memory**: 256-512 MB (vs 1024-2048 MB for JVM)

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
- Docker (for native image build)
- GraalVM 21 (optional, for local native builds)

### Build JAR (for testing)

```bash
mvn clean package
```

### Build Native Image with Docker

```bash
docker build -t backend-lambda-native .
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

## Native Image Build

The native image is built using a multi-stage Docker build:

1. **Builder stage**: Uses GraalVM container to compile Spring Boot app to native executable
2. **Runtime stage**: Uses AWS Lambda provided.al2023 runtime with the native bootstrap

### Build Process

```bash
# Build Docker image
docker build -t backend-lambda-native .

# Extract the native executable (optional)
docker create --name temp backend-lambda-native
docker cp temp:/var/runtime/bootstrap ./bootstrap
docker rm temp
```

## Deployment

The Lambda function will be deployed via CDK. The CDK stack will:

1. Build the Docker image
2. Push to ECR
3. Create Lambda function with custom runtime
4. Configure API Gateway integration
5. Set environment variables from CDK context

See `../cdk/lib/stacks/api-stack.ts` for deployment configuration.

## GraalVM Native Image Considerations

### Supported Features

- Spring Boot Web (without Tomcat)
- Spring Security OAuth2 Resource Server
- Spring Cloud Function
- Nimbus JOSE + JWT
- Jackson JSON processing

### Limitations

- No reflection-based frameworks (handled via Spring AOT)
- No dynamic class loading
- Some Spring Boot features require configuration hints

### Performance Benefits

- **Cold Start**: 200-500ms vs 3-8s (85-93% faster)
- **Memory**: 256-512 MB vs 1024-2048 MB (50-75% reduction)
- **Cost**: Significant savings due to lower memory and faster execution

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

### Native Image Build Fails

- Ensure you're using the correct GraalVM version (21)
- Check Maven dependencies are compatible with native image
- Review native-image build logs in Docker output

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
