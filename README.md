# AWS Bedrock AgentCore Example Project

Complete serverless chat application demonstrating AWS Bedrock AgentCore with React frontend, Spring Boot GraalVM native backend, and authenticated access via Amazon Cognito.

## Architecture

The project consists of four main components:

1. **Java Agent Runtime** (`agent-java/`): Containerized Java 21 AI agent running in AgentCore
2. **Backend API** (`backend-lambda/`): Spring Boot 4 Lambda for secure API access
3. **React Frontend** (`frontend/`): React + Vite application with AWS Amplify authentication
4. **CDK Infrastructure** (`cdk/`): TypeScript-based AWS CDK with multiple stacks

### Infrastructure Stacks

- **ECR Stack**: Amazon ECR repository for Docker images
- **Cognito Stack**: User authentication with Cognito User Pool and OAuth
- **AgentCore Stack**: Bedrock AgentCore runtime with OAuth authorizer and Memory
- **API Stack**: API Gateway + Spring Boot Lambda (GraalVM native)
- **CloudFront Stack**: CloudFront + S3 for React frontend hosting

### Data Flow

```
User → React Frontend (CloudFront)
         ↓ (JWT Token)
       API Gateway
         ↓ (validates token)
    Spring Boot Lambda (GraalVM Native)
         ↓ (forwards token + user ID)
    AgentCore Runtime (validates token)
         ↓
    AI Agent
```

## Key Features

- **Spring Boot 4 Lambda**: Modern Spring Boot with Spring Cloud Function for AWS Lambda
- **OAuth 2.0 Authentication**: Double token validation (Lambda + AgentCore)
- **AWS Amplify UI**: Pre-built authentication components
- **AgentCore Memory**: Persistent conversation memory with three strategies
- **Automated Frontend Builds**: Zero-config deployment with injected environment variables
- **Infrastructure as Code**: Full CDK deployment automation
- **Cost Optimized**: ~$5-10/month for development/testing

## Prerequisites

- **Java 21**: For building agent runtime
- **Maven 3.9+**: For Java dependency management
- **Docker**: For building container images
- **Node.js 18+**: For CDK and React frontend
- **AWS CLI**: Configured with appropriate credentials
- **AWS CDK CLI**: `npm install -g aws-cdk`

## Quick Start

### 1. Build Java Agent

```bash
cd agent-java
mvn clean package
cd ..
```

### 2. Install Dependencies

```bash
cd cdk && npm install && npm run build && cd ..
cd frontend && npm install && cd ..
```

### 3. Bootstrap CDK (First Time Only)

```bash
export AWS_ACCOUNT_ID=your-account-id
export AWS_REGION=us-east-1
cd cdk && cdk bootstrap aws://$AWS_ACCOUNT_ID/$AWS_REGION && cd ..
```

### 4. Deploy All Stacks

```bash
cd cdk
cdk deploy BedrockAgentCoreStack/EcrStack
cdk deploy BedrockAgentCoreStack/CognitoStack
cdk deploy BedrockAgentCoreStack/AgentCoreStack  # Auto-builds agent-java Docker image
cdk deploy BedrockAgentCoreStack/ApiStack         # Auto-builds backend Lambda image
cdk deploy BedrockAgentCoreStack/CloudFrontStack  # Auto-builds and deploys frontend
```

Or deploy all at once: `npm run deploy:all`

## Project Structure

```
aws-agentcore-example/
├── agent-java/                 # Java agent runtime
│   ├── src/main/java/
│   ├── Dockerfile
│   └── pom.xml
├── backend-lambda/             # Spring Boot GraalVM native Lambda
│   ├── src/main/java/
│   ├── Dockerfile
│   └── pom.xml
├── frontend/                   # React + Vite frontend
│   ├── src/
│   ├── package.json
│   └── .env.local.template
├── cdk/                        # CDK infrastructure
│   ├── bin/app.ts
│   └── lib/
│       ├── stacks/
│       └── constructs/
└── README.md
```

## Automated Build System

CDK automatically builds all components during deployment:

| Component | Pre-build Required? | Built During |
|-----------|---------------------|------|
| agent-java | ✅ Yes (`mvn clean package`) | AgentCore deploy |
| backend-lambda | ❌ No | API deploy |
| frontend | ❌ No | CloudFront deploy |

The frontend build automatically:
- Generates `.env.local` with values from Cognito and API stacks
- Runs `npm install` and `npm run build`
- Deploys to S3 and invalidates CloudFront cache

## OAuth Authentication

The application uses OAuth 2.0 JWT Bearer Token Authentication with double validation:

1. **Backend Lambda** validates token first (verifies JWT signature, claims)
2. **AgentCore Runtime** validates token again (defense-in-depth)

### Token Flow

```
User logs in → Cognito returns JWT → Frontend includes in Authorization header
→ Backend Lambda validates → Extracts user ID → Calls AgentCore with token
→ AgentCore validates → Executes agent → Returns response
```

### Configure Cognito OAuth (Post-Deployment)

```bash
aws cognito-idp update-user-pool-client \
  --user-pool-id YOUR_POOL_ID \
  --client-id YOUR_CLIENT_ID \
  --callback-urls "http://localhost:5173" "https://YOUR_CLOUDFRONT_DOMAIN" \
  --logout-urls "http://localhost:5173" "https://YOUR_CLOUDFRONT_DOMAIN" \
  --allowed-o-auth-flows "code" \
  --allowed-o-auth-scopes "openid" "email" "profile" \
  --allowed-o-auth-flows-user-pool-client
```

### Create Test User

```bash
aws cognito-idp admin-create-user \
  --user-pool-id YOUR_POOL_ID \
  --username testuser \
  --user-attributes Name=email,Value=test@example.com \
  --temporary-password "TempPass123!" \
  --message-action SUPPRESS

aws cognito-idp admin-set-user-password \
  --user-pool-id YOUR_POOL_ID \
  --username testuser \
  --password "YourPassword123!" \
  --permanent
```

## AgentCore Memory

The project includes AgentCore Memory with three built-in strategies:

1. **Summarization** (Short-term): Compresses conversations into concise overviews
2. **Semantic** (Long-term): Distills general factual knowledge and concepts
3. **User Preference** (Long-term): Captures user behavior patterns and preferences

### Memory Configuration

- **Memory Name**: `bedrock_agent_memory`
- **Expiration**: 90 days
- **Environment Variable**: `AGENTCORE_MEMORY_ID` (automatically passed to runtime)

### Memory Namespaces

Each strategy uses different namespace structures:

```
# Summarization (session-specific)
/strategies/{strategyId}/actors/{actorId}/sessions/{sessionId}

# Semantic and User Preference (actor-level)
/strategies/{strategyId}/actors/{actorId}
```

### Spring Boot Integration

```properties
# application.properties
agentcore.memory.id=${AGENTCORE_MEMORY_ID}
agentcore.memory.strategy.summarization=${AGENTCORE_SUMMARIZATION_STRATEGY_ID}
agentcore.memory.strategy.semantic=${AGENTCORE_SEMANTIC_STRATEGY_ID}
agentcore.memory.strategy.userpreference=${AGENTCORE_USER_PREFERENCE_STRATEGY_ID}
```

**Note**: Strategy IDs must currently be fetched at runtime using the AWS SDK since the `@aws-sdk/client-bedrock-agentcore-control` package is not yet available in Lambda. Use `LongTermMemoryProvider.loadStrategies()` to fetch them dynamically.

### Testing Memory Configuration

```bash
# Display memory configuration from CloudFormation
./get-memory-config.sh

# Export to current shell session
source <(./get-memory-config.sh AgentCoreStack env)

# Run memory test
cd agent-java
mvn exec:java -Dexec.mainClass="dev.jettro.RunLongTermMemory"
```

## Stack Dependencies

```
ECR Stack (independent)
  └─→ AgentCore Stack
        └─→ API Stack

Cognito Stack (independent)
  ├─→ AgentCore Stack (OAuth config)
  └─→ API Stack (token validation)

CloudFront Stack (independent, uses Cognito + API outputs)
```

## Development Workflow

### Java Agent Development

```bash
cd agent-java
mvn clean package
cd ../cdk
cdk deploy BedrockAgentCoreStack/AgentCoreStack
```

### Frontend Development

```bash
cd frontend
npm run dev  # Local development at http://localhost:5173
```

### Infrastructure Changes

```bash
cd cdk
npm run build
npm run synth  # Preview CloudFormation
cdk deploy BedrockAgentCoreStack/<StackName>
```

## Verification

### Test API with Cognito Token

```bash
TOKEN=$(aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id YOUR_CLIENT_ID \
  --auth-parameters USERNAME=testuser,PASSWORD=YourPassword123! \
  --query 'AuthenticationResult.AccessToken' \
  --output text)

curl -X POST YOUR_API_GATEWAY_URL/agent/invoke \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello!"}'
```

### Check CloudWatch Logs

```bash
aws logs tail /aws/lambda/agentcore-backend-api --follow
aws logs tail /aws/bedrock-agentcore/runtime/bedrock_agent_runtime --follow
```

## Outputs

After deployment, view outputs:

```bash
aws cloudformation describe-stacks --stack-name BedrockAgentCoreStack \
  --query 'Stacks[0].Outputs' --output table
```

Key outputs:
- **ECR Repository URI**: Docker image registry
- **Cognito User Pool ID / Client ID**: Authentication configuration
- **CloudFront Domain**: Frontend URL
- **Runtime ARN**: Bedrock AgentCore runtime
- **Memory ID**: AgentCore Memory instance

## Cleanup

```bash
cd cdk
npm run destroy  # Destroys all stacks
```

Or destroy in reverse dependency order:
```bash
cdk destroy BedrockAgentCoreStack/CloudFrontStack
cdk destroy BedrockAgentCoreStack/ApiStack
cdk destroy BedrockAgentCoreStack/AgentCoreStack
cdk destroy BedrockAgentCoreStack/CognitoStack
cdk destroy BedrockAgentCoreStack/EcrStack
```

## Troubleshooting

### Build Failures

- **Java Lambda build fails**: Ensure Docker is running with 4GB+ memory
- **CDK deployment fails**: Check `aws sts get-caller-identity` and IAM permissions

### Authentication Issues

- **Cannot log in**: Verify callback URLs match exactly (including trailing slashes)
- **Token validation fails**: Check token expiration (default: 1 hour) and User Pool ID
- **Backend validates but AgentCore rejects**: Verify OAuth authorizer config is deployed

### Frontend Issues

- **Blank page**: Check CloudFront logs and browser console
- **API calls fail**: Verify API endpoint URL and CORS configuration

### Memory Issues

- **Strategy IDs are null**: Fetch dynamically using `LongTermMemoryProvider.loadStrategies()`
- **"MemoryId not found"**: Redeploy CDK stack with memory construct

## Cost Estimate

| Service | Monthly Cost (Dev/Test) |
|---------|------------------------|
| Lambda | ~$0.20 per million requests |
| API Gateway | ~$1.00 per million requests |
| CloudFront | ~$0.085 per GB |
| S3 | ~$0.023 per GB |
| Cognito | Free tier (50,000 MAU) |
| **Total** | **~$5-10/month** |

## Known Issues

### Node.js 16 Lambda Warning

The `cdk-docker-image-deployment` package creates Lambda functions using Node.js 16 runtime (deprecated). These are only used during CDK deployment, not at application runtime. Monitor for package updates: `npm outdated cdk-docker-image-deployment`

### Memory Strategy IDs SDK

The `@aws-sdk/client-bedrock-agentcore-control` package is not yet available in Lambda runtimes. Strategy IDs must be fetched at application runtime rather than deployment time.

## References

- [AWS Bedrock AgentCore Documentation](https://docs.aws.amazon.com/bedrock-agentcore/)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [Spring Boot GraalVM Native](https://docs.spring.io/spring-boot/docs/current/reference/html/native-image.html)
- [AWS Amplify Documentation](https://docs.amplify.aws/)

## License

This is an example project for demonstration purposes.
