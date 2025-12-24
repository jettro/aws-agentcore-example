# AWS Bedrock AgentCore Example Project

Complete serverless chat application demonstrating AWS Bedrock AgentCore with React frontend, Spring Boot GraalVM native backend, and authenticated access via Amazon Cognito.

## Architecture

The project consists of four main components:

1. **Java Agent Runtime** (`agent-java/`): Containerized Java 21 AI agent running in AgentCore
2. **Backend API** (`backend-lambda/`): Spring Boot 3 GraalVM native Lambda for secure API access
3. **React Frontend** (`frontend/`): React + Vite application with AWS Amplify authentication
4. **CDK Infrastructure** (`cdk/`): TypeScript-based AWS CDK with multiple stacks

### Infrastructure Components

- **ECR Stack**: Amazon ECR repository for Docker images
- **Cognito Stack**: User authentication with Cognito User Pool and OAuth
- **AgentCore Stack**: Bedrock AgentCore runtime with OAuth authorizer and AgentCore Memory
- **API Stack**: API Gateway + Spring Boot Lambda (GraalVM native) for backend
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

## Prerequisites

- **Java 21**: For building agent runtime and backend Lambda
- **Maven 3.9+**: For Java dependency management
- **Docker**: For building native images (ensure 8GB+ memory allocated)
- **Node.js 18+**: For CDK and React frontend
- **AWS CLI**: Configured with appropriate credentials
- **AWS CDK CLI**: `npm install -g aws-cdk`

## Project Structure

```
aws-agentcore-example/
├── agent-java/                 # Java agent runtime
│   ├── src/main/java/
│   ├── Dockerfile
│   └── pom.xml
├── backend-lambda/             # Spring Boot GraalVM native Lambda
│   ├── src/main/java/
│   ├── Dockerfile             # GraalVM native image build
│   ├── pom.xml
│   └── README.md
├── frontend/                   # React + Vite frontend
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── services/         # API client
│   │   └── config/           # AWS Amplify config
│   ├── package.json
│   └── .env.local.template
├── cdk/                        # CDK infrastructure
│   ├── bin/app.ts
│   ├── lib/
│   │   ├── stacks/           # 6 stacks
│   │   └── constructs/       # 9 constructs
│   └── package.json
├── DEPLOYMENT.md               # Detailed deployment guide
├── OAUTH_CONFIGURATION.md      # OAuth setup documentation
└── README.md
```

## Quick Start

### 1. Build Java Components

**Build agent runtime:**
```bash
cd agent-java
mvn clean package
cd ..
```

**Note**: Backend Lambda Docker image is built automatically by CDK during deployment.

### 2. Install CDK Dependencies

```bash
cd cdk
npm install
npm run build
cd ..
```

### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### 4. Bootstrap CDK (First Time Only)

```bash
export AWS_ACCOUNT_ID=your-account-id
export AWS_REGION=us-east-1

cd cdk
cdk bootstrap aws://$AWS_ACCOUNT_ID/$AWS_REGION
cd ..
```

## Deployment

### Prerequisites for Deployment

**Before deploying, ensure:**
1. ✅ Java agent is built: `agent-java/target/*.jar` exists
2. ✅ CDK dependencies installed: `cdk/node_modules/` exists
3. ✅ Docker is running (for native image builds)

### Deployment Steps

**Step 1: Deploy Infrastructure (Automated Builds)**

CDK will automatically build Docker images during deployment:
- AgentCore stack builds `agent-java` Docker image
- API stack builds `backend-lambda` GraalVM native image (~10-15 min first time)

```bash
cd cdk

# Deploy core infrastructure
cdk deploy BedrockAgentCoreStack/EcrStack
cdk deploy BedrockAgentCoreStack/CognitoStack

# Deploy AgentCore (auto-builds agent-java Docker image)
cdk deploy BedrockAgentCoreStack/AgentCoreStack

# Deploy API (auto-builds backend-lambda GraalVM native image)
cdk deploy BedrockAgentCoreStack/ApiStack
```

**Step 2: Deploy Frontend (Automated)**

The CloudFrontStack automatically builds and deploys the frontend with injected environment variables:

```bash
cdk deploy BedrockAgentCoreStack/CloudFrontStack
```

The stack will:
- Generate `.env.local` with values from Cognito and API stacks
- Run `npm install` and `npm run build` automatically
- Deploy to S3 and invalidate CloudFront cache

**Alternative: Manual Build** (optional, for local testing)

```bash
# Get stack outputs
aws cloudformation describe-stacks \
  --stack-name BedrockAgentCoreStack-CognitoStack \
  --query 'Stacks[0].Outputs'

aws cloudformation describe-stacks \
  --stack-name BedrockAgentCoreStack-ApiStack \
  --query 'Stacks[0].Outputs'

# Configure and build
cd ../frontend
cp .env.local.template .env.local
# Edit .env.local with your values
npm run build
cd ../cdk
cdk deploy BedrockAgentCoreStack/CloudFrontStack
```

### One-Command Deployment (Advanced)

**Deploy all stacks at once:**
```bash
cd cdk
npm run deploy:all  # Deploys all stacks in dependency order
```

**Note**: Frontend is now automatically configured and built during CloudFrontStack deployment.

## How CDK Builds Work

### Automated Docker Image Builds

CDK automatically builds Docker images during deployment - **no manual Docker commands needed**!

**AgentCore Stack** (`agent-java/`):
- Uses `cdk-docker-image-deployment` package
- Builds Docker image from `agent-java/Dockerfile`
- Pushes to ECR automatically
- **Prerequisite**: JAR must exist (`mvn clean package`)

**API Stack** (`backend-lambda/`):
- Uses `DockerImageAsset` construct
- Builds Spring Boot JAR in Docker from `backend-lambda/Dockerfile`
- Standard Java 21 Lambda runtime
- Takes 2-3 minutes on first build
- **Prerequisite**: None (builds from source during CDK deploy)

**CloudFront Stack** (`frontend/`):
- Uses `FrontendBuildConstruct` for automated builds
- Generates `.env.local` from CDK stack outputs
- Runs `npm install` and `npm run build` automatically
- Uploads to S3 and invalidates CloudFront cache
- **Prerequisite**: None (fully automated)
- **Alternative**: Pre-build manually if desired

### Build Requirements Summary

| Component | Pre-build Required? | Command | When |
|-----------|---------------------|---------|------|
| agent-java | ✅ Yes | `mvn clean package` | Before AgentCore deploy |
| backend-lambda | ❌ No | Auto-built by CDK | During API deploy |
| frontend | ❌ No (automated) | Auto-built by CDK | During CloudFront deploy |

## Stack Dependencies

```
ECR Stack (independent)
  └─→ AgentCore Stack
        └─→ API Stack

Cognito Stack (independent)
  ├─→ AgentCore Stack (OAuth config)
  └─→ API Stack (token validation)

CloudFront Stack (independent, but frontend needs configuration from above stacks)
```

**Dependency Details:**
- **ECR Stack**: No dependencies
- **Cognito Stack**: No dependencies
- **AgentCore Stack**: Requires ECR + Cognito
- **API Stack**: Requires Cognito + AgentCore
- **CloudFront Stack**: No dependencies (but frontend needs Cognito + API outputs)

## Development Workflow

### Java Agent Development

1. Make changes to Java code in `agent-java/src/`
2. Build: `cd agent-java && mvn clean package && cd ..`
3. Deploy (this automatically builds and pushes Docker image): `cd cdk && cdk deploy BedrockAgentCoreStack/AgentCoreStack`

The CDK will automatically detect changes, rebuild the Docker image, and deploy it to ECR.

### Infrastructure Changes

1. Make changes to TypeScript code in `cdk/lib/`
2. Build: `npm run build`
3. Synth to check CloudFormation: `npm run synth`
4. Deploy: `npm run deploy` or `npm run deploy:all`

## Useful CDK Commands

- `npm run build` - Compile TypeScript to JavaScript
- `npm run watch` - Watch for changes and compile
- `npm run synth` - Synthesize CloudFormation templates
- `cdk diff` - Compare deployed stack with current state
- `cdk deploy` - Deploy stack to AWS
- `cdk destroy` - Remove stack from AWS

## Known Issues

### Node.js 16 Lambda Functions Warning

You may receive AWS notifications about Lambda functions using the deprecated Node.js 16 runtime. These Lambda functions are created by the `cdk-docker-image-deployment` package and are only used during CDK deployment to orchestrate the Docker image copying process.

**Important notes:**
- These Lambda functions are NOT part of your agent application runtime
- They only execute during `cdk deploy` operations
- Your Java-based agent runtime is unaffected
- The functions will continue to work until AWS provides a migration deadline

**Resolution:**
- The `cdk-docker-image-deployment` package maintainers will update to a newer Node.js runtime in a future release
- Monitor for package updates: `npm outdated cdk-docker-image-deployment`
- Update the package when a new version is available: `npm update cdk-docker-image-deployment`

## AgentCore Memory Integration

This project includes AgentCore Memory with three built-in strategies:

1. **Summarization Strategy** (Short-term): Maintains conversation summaries
2. **Semantic Strategy** (Long-term): Stores and retrieves semantically similar information
3. **User Preference Strategy** (Long-term): Tracks user preferences and patterns

The memory ID is automatically passed to the agent runtime as the `AGENTCORE_MEMORY_ID` environment variable. The agent runtime has full permissions to interact with the memory, including creating events, managing records, and running extraction jobs.

For detailed integration instructions, see `MEMORY_INTEGRATION.md`.

## Configuration

### Environment Variables

The CDK app reads these environment variables:

- `AWS_ACCOUNT_ID` or `CDK_DEFAULT_ACCOUNT`: AWS account ID
- `AWS_REGION` or `CDK_DEFAULT_REGION`: AWS region (defaults to us-east-1)

The agent runtime receives these environment variables automatically:

- `AGENTCORE_MEMORY_ID`: The ID of the AgentCore Memory instance

### Customization

You can customize the following in the stack files:

- **Repository Name**: Edit `ecr-stack.ts` - `repositoryName`
- **Image Tag**: Edit `main-stack.ts` - `imageTag` parameter
- **Runtime Name**: Edit `agentcore-stack.ts` - `runtimeName`
- **Cognito Settings**: Edit `cognito-userpool-construct.ts`

## Outputs

After deployment, the following outputs are available:

- **ECR Repository URI**: For pushing Docker images
- **Cognito User Pool ID**: For authentication integration
- **Cognito Client ID**: For frontend applications
- **CloudFront Domain**: For accessing static content
- **Runtime ARN**: Bedrock AgentCore runtime ARN

View outputs:
```bash
aws cloudformation describe-stacks --stack-name BedrockAgentCoreStack \
  --query 'Stacks[0].Outputs' --output table
```

## Cleanup

To remove all resources:

```bash
cd cdk
npm run destroy
```

Or destroy individual stacks:
```bash
cdk destroy BedrockAgentCoreStack/AgentCoreStack
cdk destroy BedrockAgentCoreStack/CloudFrontStack
cdk destroy BedrockAgentCoreStack/CognitoStack
cdk destroy BedrockAgentCoreStack/EcrStack
```

**Note**: Destroy stacks in reverse dependency order (AgentCore before ECR).

## Post-Deployment Configuration

### 1. Configure Cognito OAuth

Add callback URLs for your application:
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

### 2. Create Test User

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

### 3. Test Locally

```bash
cd frontend
npm run dev
# Visit http://localhost:5173
```

## Next Steps

1. ✅ Implement custom agent logic in `AgentRuntime.java`
2. ✅ Add authentication (Cognito + OAuth)
3. ✅ Build frontend with chat interface
4. Integrate more Bedrock foundation models
5. Add conversation history persistence
6. Set up custom domain with Route 53
7. Implement CI/CD pipeline

## Documentation

- **DEPLOYMENT.md**: Complete step-by-step deployment guide with troubleshooting
- **OAUTH_CONFIGURATION.md**: OAuth setup and token validation flow explained
- **backend-lambda/README.md**: GraalVM native image development guide
- **frontend/README.md**: React frontend setup and configuration

## Key Features

- ✅ **GraalVM Native Lambda**: 200-500ms cold starts (vs 3-8s JVM), 50-75% memory reduction
- ✅ **OAuth 2.0 Authentication**: Double token validation (Lambda + AgentCore)
- ✅ **AWS Amplify UI**: Pre-built authentication components
- ✅ **AgentCore Memory**: Persistent conversation memory with strategies
- ✅ **Infrastructure as Code**: Full CDK deployment automation
- ✅ **Cost Optimized**: ~$5-10/month for development/testing

## References

- [AWS Bedrock AgentCore Documentation](https://docs.aws.amazon.com/bedrock-agentcore/)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [Spring Boot GraalVM Native](https://docs.spring.io/spring-boot/docs/current/reference/html/native-image.html)
- [AWS Amplify Documentation](https://docs.amplify.aws/)

## License

This is an example project for demonstration purposes.
