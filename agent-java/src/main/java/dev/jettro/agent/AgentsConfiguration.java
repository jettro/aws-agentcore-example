package dev.jettro.agent;

import org.springaicommunity.agentcore.memory.AgentCoreMemoryProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import software.amazon.awssdk.services.bedrockagentcore.BedrockAgentCoreClient;
import software.amazon.awssdk.services.bedrockagentcorecontrol.BedrockAgentCoreControlClient;

@Configuration
public class AgentsConfiguration {
    @Bean
    BedrockAgentCoreControlClient bedrockAgentCoreControlClient() {
        return BedrockAgentCoreControlClient.create();
    }

    @Bean
    @Lazy
    LongTermMemoryProvider longTermMemoryProvider(BedrockAgentCoreControlClient controlClient,
                                                  BedrockAgentCoreClient coreClient,
                                                  AgentCoreMemoryProperties configuration) {
        return new LongTermMemoryProvider(controlClient, coreClient, configuration.memoryId() );
    }
}
