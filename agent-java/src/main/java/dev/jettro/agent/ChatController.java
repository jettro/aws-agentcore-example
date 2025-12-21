package dev.jettro.agent;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springaicommunity.agentcore.annotation.AgentCoreInvocation;
import org.springaicommunity.agentcore.context.AgentCoreContext;
import org.springaicommunity.agentcore.context.AgentCoreHeaders;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.memory.ChatMemoryRepository;
import org.springframework.ai.chat.memory.MessageWindowChatMemory;
import org.springframework.web.bind.annotation.RestController;

import javax.swing.*;

@RestController
public class ChatController {

	private final ChatClient chatClient;
    private final ChatMemory chatMemory;

    private static final Logger logger = LoggerFactory.getLogger(ChatController.class);

	public ChatController (ChatClient.Builder chatClient, ChatMemoryRepository memoryRepository){
        this.chatMemory = MessageWindowChatMemory.builder()
                .chatMemoryRepository(memoryRepository)
                .maxMessages(10)
                .build();

        this.chatClient = chatClient
                .defaultAdvisors(MessageChatMemoryAdvisor.builder(chatMemory).build())
				.defaultTools(new DateTimeTools())
				.build();
	}

    @AgentCoreInvocation
    public String agentCoreHandler(PromptRequest promptRequest, AgentCoreContext agentCoreContext){
        var sessionId = agentCoreContext.getHeader(AgentCoreHeaders.SESSION_ID);
        logger.info(sessionId);

        return chatClient
                .prompt()
                .advisors(a -> a.param(ChatMemory.CONVERSATION_ID, conversationId(promptRequest, sessionId)))
                .user(promptRequest.prompt())
                .call()
                .content();
    }

    private String conversationId(PromptRequest promptRequest, String sessionId){
        return "%s:%s".formatted(promptRequest.actor(), sessionId);
    }
}
