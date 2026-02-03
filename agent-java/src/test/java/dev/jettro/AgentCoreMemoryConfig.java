package dev.jettro;

import software.amazon.awssdk.auth.credentials.ProfileCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.cloudformation.CloudFormationClient;
import software.amazon.awssdk.services.cloudformation.CloudFormationClientBuilder;
import software.amazon.awssdk.services.cloudformation.model.DescribeStacksRequest;
import software.amazon.awssdk.services.cloudformation.model.Output;
import software.amazon.awssdk.services.cloudformation.model.Stack;

import java.util.HashMap;
import java.util.Map;

/**
 * Utility to fetch AgentCore Memory configuration from CloudFormation stack outputs.
 * Use this in your tests to get the deployed memory and strategy IDs.
 */
public class AgentCoreMemoryConfig {
    
    private final String memoryId;
    private final String memoryArn;
    private final String summarizationStrategyId;
    private final String semanticStrategyId;
    private final String userPreferenceStrategyId;
    
    private AgentCoreMemoryConfig(String memoryId, String memoryArn, 
                                  String summarizationStrategyId,
                                  String semanticStrategyId,
                                  String userPreferenceStrategyId) {
        this.memoryId = memoryId;
        this.memoryArn = memoryArn;
        this.summarizationStrategyId = summarizationStrategyId;
        this.semanticStrategyId = semanticStrategyId;
        this.userPreferenceStrategyId = userPreferenceStrategyId;
    }
    
    /**
     * Load configuration from CloudFormation stack outputs.
     * 
     * @param stackName The name of the CloudFormation stack (e.g., "AgentCoreStack")
     * @return AgentCoreMemoryConfig with all IDs populated
     */
    public static AgentCoreMemoryConfig fromCloudFormation(String stackName) {
        return fromCloudFormation(stackName, null);
    }
    
    /**
     * Load configuration from CloudFormation stack outputs with a specific AWS profile.
     * 
     * @param stackName The name of the CloudFormation stack (e.g., "AgentCoreStack")
     * @param profileName The AWS profile name (e.g., "personal"), or null for default
     * @return AgentCoreMemoryConfig with all IDs populated
     */
    public static AgentCoreMemoryConfig fromCloudFormation(String stackName, String profileName) {
        CloudFormationClientBuilder builder = CloudFormationClient.builder();
        
        if (profileName != null && !profileName.isEmpty()) {
            System.out.println("Using AWS profile: " + profileName);
            builder.credentialsProvider(ProfileCredentialsProvider.create(profileName));
        }
        
        // Set region if available from environment
        String regionEnv = System.getenv("AWS_REGION");
        if (regionEnv != null && !regionEnv.isEmpty()) {
            System.out.println("Using region from AWS_REGION: " + regionEnv);
            builder.region(Region.of(regionEnv));
        }
        
        try (CloudFormationClient cfnClient = builder.build()) {
            DescribeStacksRequest request = DescribeStacksRequest.builder()
                    .stackName(stackName)
                    .build();
            
            Stack stack = cfnClient.describeStacks(request).stacks().get(0);
            Map<String, String> outputs = new HashMap<>();
            
            for (Output output : stack.outputs()) {
                outputs.put(output.outputKey(), output.outputValue());
            }
            
            System.out.println("Stack outputs found:");
            outputs.forEach((key, value) -> System.out.println("  " + key + ": " + value));
            System.out.println();
            
            String memoryId = outputs.get("MemoryId");
            String memoryArn = outputs.get("MemoryArn");
            String summarizationStrategyId = outputs.get("SummarizationStrategyId");
            String semanticStrategyId = outputs.get("SemanticStrategyId");
            String userPreferenceStrategyId = outputs.get("UserPreferenceStrategyId");
            
            if (memoryId == null) {
                System.err.println("ERROR: MemoryId not found in stack outputs.");
                System.err.println("Available outputs: " + outputs.keySet());
                System.err.println("\nPossible causes:");
                System.err.println("  1. Stack name '" + stackName + "' is incorrect");
                System.err.println("  2. Stack hasn't been deployed yet");
                System.err.println("  3. AWS credentials/SSO token expired");
                System.err.println("\nTry: aws sso login --profile personal");
                throw new IllegalStateException("MemoryId not found in stack outputs");
            }
            
            return new AgentCoreMemoryConfig(
                    memoryId,
                    memoryArn,
                    summarizationStrategyId,
                    semanticStrategyId,
                    userPreferenceStrategyId
            );
        } catch (Exception e) {
            System.err.println("ERROR: Failed to fetch stack outputs from CloudFormation");
            System.err.println("Stack name: " + stackName);
            System.err.println("Error: " + e.getMessage());
            System.err.println("\nMake sure:");
            System.err.println("  1. AWS credentials are configured: aws sts get-caller-identity");
            System.err.println("  2. Stack '" + stackName + "' exists and is deployed");
            System.err.println("  3. SSO token is valid: aws sso login --profile personal");
            throw new RuntimeException("Failed to load configuration from CloudFormation", e);
        }
    }
    
    /**
     * Load configuration from environment variables (useful when running in the actual runtime).
     */
    public static AgentCoreMemoryConfig fromEnvironment() {
        String memoryId = System.getenv("AGENTCORE_MEMORY_ID");
        String summarizationStrategyId = System.getenv("AGENTCORE_SUMMARIZATION_STRATEGY_ID");
        String semanticStrategyId = System.getenv("AGENTCORE_SEMANTIC_STRATEGY_ID");
        String userPreferenceStrategyId = System.getenv("AGENTCORE_USER_PREFERENCE_STRATEGY_ID");
        
        if (memoryId == null) {
            throw new IllegalStateException("AGENTCORE_MEMORY_ID environment variable not set");
        }
        
        return new AgentCoreMemoryConfig(
                memoryId,
                null, // ARN not needed from env vars
                summarizationStrategyId,
                semanticStrategyId,
                userPreferenceStrategyId
        );
    }
    
    public String getMemoryId() {
        return memoryId;
    }
    
    public String getMemoryArn() {
        return memoryArn;
    }
    
    public String getSummarizationStrategyId() {
        return summarizationStrategyId;
    }
    
    public String getSemanticStrategyId() {
        return semanticStrategyId;
    }
    
    public String getUserPreferenceStrategyId() {
        return userPreferenceStrategyId;
    }
    
    @Override
    public String toString() {
        return "AgentCoreMemoryConfig{" +
                "memoryId='" + memoryId + '\'' +
                ", memoryArn='" + memoryArn + '\'' +
                ", summarizationStrategyId='" + summarizationStrategyId + '\'' +
                ", semanticStrategyId='" + semanticStrategyId + '\'' +
                ", userPreferenceStrategyId='" + userPreferenceStrategyId + '\'' +
                '}';
    }
    
    /**
     * Print configuration in a format that can be used in application.properties
     */
    public void printAsProperties() {
        System.out.println("# AgentCore Memory Configuration");
        System.out.println("agentcore.memory.id=" + memoryId);
        if (summarizationStrategyId != null) {
            System.out.println("agentcore.memory.strategy.summarization=" + summarizationStrategyId);
        }
        if (semanticStrategyId != null) {
            System.out.println("agentcore.memory.strategy.semantic=" + semanticStrategyId);
        }
        if (userPreferenceStrategyId != null) {
            System.out.println("agentcore.memory.strategy.userpreference=" + userPreferenceStrategyId);
        }
    }
}
