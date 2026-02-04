package dev.jettro.agent;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.services.bedrockagentcorecontrol.BedrockAgentCoreControlClient;

@Configuration
public class AgentsConfiguration {
    @Bean
    BedrockAgentCoreControlClient bedrockAgentCoreControlClient() {
        return BedrockAgentCoreControlClient.create();
    }
}
