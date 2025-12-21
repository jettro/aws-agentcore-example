# AWS Bedrock AgentCore Example Project

This project demonstrates a complete AWS Bedrock AgentCore deployment using AWS CDK with TypeScript infrastructure and a Java 21-based agent runtime.

## Architecture

The project consists of two main components:

1. **Java Agent Runtime** (`agent-java/`): A containerized Java 21 application that runs as the Bedrock agent
2. **CDK Infrastructure** (`cdk/`): TypeScript-based AWS CDK infrastructure with multiple independently deployable stacks

### Infrastructure Components

- **ECR Stack**: Amazon ECR repository for storing agent runtime Docker images
- **Cognito Stack**: User authentication with Cognito User Pool
- **AgentCore Stack**: Bedrock AgentCore runtime with public network configuration
- **CloudFront Stack**: CloudFront distribution with S3 for static content delivery

All stacks use reusable constructs following best practices for separation of concerns.

## Prerequisites

- **Java 21**: For building the agent runtime
- **Maven**: For Java dependency management
- **Docker**: For building and pushing container images
- **Node.js 18+**: For CDK development
- **AWS CLI**: Configured with appropriate credentials
- **AWS CDK CLI**: `npm install -g aws-cdk`

## Project Structure

```
aws-agentcore-example/
├── agent-java/                 # Java agent runtime
│   ├── src/main/java/dev/jettro/agent/
│   ├── Dockerfile
│   └── pom.xml
├── cdk/                        # CDK infrastructure
│   ├── bin/app.ts             # CDK app entry point
│   ├── lib/
│   │   ├── stacks/            # Stack definitions
│   │   └── constructs/        # Reusable constructs
│   ├── package.json
│   ├── tsconfig.json
│   └── cdk.json
└── README.md
```

## Setup Instructions

### 1. Java Agent Setup

Navigate to the Java agent directory and build the project:

```bash
cd agent-java
mvn clean package
```

This creates a fat JAR with all dependencies in `target/bedrock-agent-*-jar-with-dependencies.jar`.

### 2. CDK Infrastructure Setup

Navigate to the CDK directory and install dependencies:

```bash
cd cdk
npm install
```

Build the TypeScript code:

```bash
npm run build
```

### 3. AWS Configuration

Set your AWS account and region:

```bash
export AWS_ACCOUNT_ID=your-account-id
export AWS_REGION=us-east-1  # or your preferred region
```

Bootstrap CDK (first time only):

```bash
cdk bootstrap aws://$AWS_ACCOUNT_ID/$AWS_REGION
```

## Deployment

### Option 1: Deploy All Stacks at Once

Deploy the entire infrastructure:

```bash
cd cdk
npm run deploy:all
```

### Option 2: Deploy Individual Stacks

Deploy stacks independently using nested stack naming:

```bash
# Deploy ECR repository first
cdk deploy BedrockAgentCoreStack/EcrStack

# Deploy Cognito (independent)
cdk deploy BedrockAgentCoreStack/CognitoStack

# Deploy CloudFront (independent)
cdk deploy BedrockAgentCoreStack/CloudFrontStack

# Deploy AgentCore (after ECR)
cdk deploy BedrockAgentCoreStack/AgentCoreStack
```

## Automated Docker Image Build and Push

The CDK infrastructure automatically builds and pushes the Docker image to ECR when you deploy the AgentCore stack. This is done using the `cdk-docker-image-deployment` package.

**How it works:**
1. When you deploy the AgentCore stack, CDK will:
   - Build the Java application (ensure JAR exists in `agent-java/target/`)
   - Build the Docker image from `agent-java/Dockerfile`
   - Push the image to an intermediary CDK-managed ECR repository
   - Use a CodeBuild project to copy the image to your custom ECR repository (`bedrock-agent-runtime`)
   - Configure the AgentCore runtime to use the image from your repository

**Before deployment**, ensure the JAR file exists:
```bash
cd agent-java
mvn clean package
cd ..
```

Then deploy:
```bash
cd cdk
npm run deploy:all
```

The Docker image will be built and pushed automatically during deployment. No manual Docker commands needed!

## Stack Dependencies

- **ECR Stack**: No dependencies, can be deployed first
- **Cognito Stack**: No dependencies, can be deployed independently
- **CloudFront Stack**: No dependencies, can be deployed independently  
- **AgentCore Stack**: Depends on ECR Stack (requires repository to exist)

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

## Next Steps

1. Implement custom agent logic in `AgentRuntime.java`
2. Add tools and actions to your agent
3. Integrate with Bedrock foundation models
4. Build frontend application using Cognito authentication
5. Deploy static content to S3/CloudFront

## References

- [AWS Bedrock AgentCore CDK Documentation](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-bedrock-agentcore-alpha-readme.html)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)

## License

This is an example project for demonstration purposes.
