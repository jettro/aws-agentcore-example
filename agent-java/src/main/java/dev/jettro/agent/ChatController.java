package dev.jettro.agent;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springaicommunity.agentcore.annotation.AgentCoreInvocation;
import org.springaicommunity.agentcore.context.AgentCoreContext;
import org.springaicommunity.agentcore.context.AgentCoreHeaders;
import org.springaicommunity.agentcore.memory.longterm.AgentCoreMemory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ChatController {

    private final ChatClient chatClient;

    private static final Logger logger = LoggerFactory.getLogger(ChatController.class);

    public ChatController(ChatClient.Builder chatClientBuilder, AgentCoreMemory agentCoreMemory) {
        this.chatClient = chatClientBuilder
                .defaultAdvisors(agentCoreMemory.advisors)  // Adds long and short-term advisors
                .defaultTools(new DateTimeTools())
                .build();
    }

    @AgentCoreInvocation
    public String agentCoreHandler(PromptRequest promptRequest, AgentCoreContext agentCoreContext) {
        logger.info("Received prompt: {}", promptRequest.prompt());
        var sessionId = agentCoreContext.getHeader(AgentCoreHeaders.SESSION_ID);
        logger.info("The session id for the prompt is: {}", sessionId);

        return chatClient
                .prompt()
                .advisors(a -> a.param(ChatMemory.CONVERSATION_ID, conversationId(promptRequest, sessionId)))
                .user(promptRequest.prompt())
                .call()
                .content();
    }

    private String conversationId(PromptRequest promptRequest, String sessionId) {
        return "%s:%s".formatted(promptRequest.actor(), sessionId);
    }
}
