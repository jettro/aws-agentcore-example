package dev.jettro;

import dev.jettro.agent.SearchMemoryRequest;
import software.amazon.awssdk.services.bedrockagentcore.BedrockAgentCoreClient;
import software.amazon.awssdk.services.bedrockagentcorecontrol.BedrockAgentCoreControlClient;

public class RunLongTermMemory {
    public static void main(String[] args) {
        System.out.println("Load the memory!");
        
        // Load configuration from CloudFormation stack
        // Usage: RunLongTermMemory [stackName] [awsProfile]
        // Note: Use the nested AgentCore stack, not the main stack
        String stackName = args.length > 0 ? args[0] : "BedrockAgentCoreStack833DC700";
        String awsProfile = args.length > 1 ? args[1] : "personal";
        
        System.out.println("Loading configuration from CloudFormation stack: " + stackName);
        System.out.println("Using AWS profile: " + awsProfile);
        
        AgentCoreMemoryConfig config = AgentCoreMemoryConfig.fromCloudFormation(stackName, awsProfile);
        System.out.println("\nLoaded configuration:");
        System.out.println(config);
        System.out.println();
        config.printAsProperties();
        System.out.println();

        BedrockAgentCoreControlClient controlClient = BedrockAgentCoreControlClient.create();
        BedrockAgentCoreClient coreClient = BedrockAgentCoreClient.create();

//        LongTermMemoryProvider provider = new LongTermMemoryProvider(
//                controlClient,
//                coreClient,
//                config.getMemoryId());
//
//        provider.loadStrategies();
//
//        String sessionId = "session-413e123e-c8c7-45a2-8d1c-5939c0e33b1e";
//
//        var request = new SearchMemoryRequest("dogs", "jettro", sessionId);
//
//        System.out.println("***** Print semantic memories:");
//        provider.searchSemanticMemories(request).forEach(System.out::println);
//        provider.searchSemanticMemories(request).forEach(System.out::println);
//        System.out.println("***** Print summary memories:");
//        provider.searchSummaryMemories(request).forEach(System.out::println);
//        System.out.println("***** Print user preference memories:");
//        provider.searchUserPreferenceMemories(request).forEach(System.out::println);

        System.out.println("Done!");
    }
}
