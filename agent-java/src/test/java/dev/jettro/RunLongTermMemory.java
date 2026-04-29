package dev.jettro;

import software.amazon.awssdk.services.bedrockagentcore.BedrockAgentCoreClient;
import software.amazon.awssdk.services.bedrockagentcore.model.ListMemoryRecordsRequest;
import software.amazon.awssdk.services.bedrockagentcorecontrol.BedrockAgentCoreControlClient;
import software.amazon.awssdk.services.bedrockagentcorecontrol.model.GetMemoryRequest;
import software.amazon.awssdk.services.bedrockagentcorecontrol.model.GetMemoryResponse;

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

        ListMemoryRecordsRequest.Builder builder = ListMemoryRecordsRequest.builder();
        builder.memoryId(config.getMemoryId());
        builder.maxResults(10);
        builder.namespace("user");
        builder.memoryStrategyId("summary_builtin_cdkGen0001-kH60z8CKL1");
        ListMemoryRecordsRequest request = builder.build();

        var memRecords = coreClient.listMemoryRecords(request);

        System.out.println("***** Print user preference memories:");
        memRecords.memoryRecordSummaries().forEach(System.out::println);

        var getMemoryRequest = GetMemoryRequest.builder()
                .memoryId(config.getMemoryId())
                .build();
        GetMemoryResponse memory = controlClient.getMemory(getMemoryRequest);


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
