package dev.jettro;

import dev.jettro.agent.LongTermMemoryProvider;
import dev.jettro.agent.SearchMemoryRequest;
import software.amazon.awssdk.services.bedrockagentcore.BedrockAgentCoreClient;
import software.amazon.awssdk.services.bedrockagentcorecontrol.BedrockAgentCoreControlClient;

public class RunLongTermMemory {
    public static void main(String[] args) {
        System.out.println("Load the memory!");

        BedrockAgentCoreControlClient controlClient = BedrockAgentCoreControlClient.create();
        BedrockAgentCoreClient coreClient = BedrockAgentCoreClient.create();

        LongTermMemoryProvider provider = new LongTermMemoryProvider(
                controlClient,
                coreClient,
                "bedrock_agent_memory-5W3Kjk9dLT");

        provider.loadStrategies();

        String sessionId = "session-413e123e-c8c7-45a2-8d1c-5939c0e33b1e";

        var request = new SearchMemoryRequest("dogs", "jettro", sessionId);

        System.out.println("***** Print semantic memories:");
        provider.searchSemanticMemories(request).forEach(System.out::println);
        provider.searchSemanticMemories(request).forEach(System.out::println);
        System.out.println("***** Print summary memories:");
        provider.searchSummaryMemories(request).forEach(System.out::println);
        System.out.println("***** Print user preference memories:");
        provider.searchUserPreferenceMemories(request).forEach(System.out::println);

        System.out.println("Done!");
    }
}
