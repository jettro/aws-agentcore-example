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
    private final LongTermMemoryProvider memoryProvider;

    private static final Logger logger = LoggerFactory.getLogger(ChatController.class);

	public ChatController (ChatClient.Builder chatClient, ChatMemoryRepository memoryRepository, LongTermMemoryProvider memoryProvider){
        this.chatMemory = MessageWindowChatMemory.builder()
                .chatMemoryRepository(memoryRepository)
                .maxMessages(10)
                .build();

        this.chatClient = chatClient
                .defaultAdvisors(MessageChatMemoryAdvisor.builder(chatMemory).build())
				.defaultTools(new DateTimeTools())
				.build();
        this.memoryProvider = memoryProvider;
    }

    @AgentCoreInvocation
    public String agentCoreHandler(PromptRequest promptRequest, AgentCoreContext agentCoreContext){
        System.out.println("[AGENTCORE] Method invoked - Received prompt: " + promptRequest.prompt());
        logger.info("Received prompt: {}", promptRequest.prompt());
        var sessionId = agentCoreContext.getHeader(AgentCoreHeaders.SESSION_ID);
        System.out.println("[AGENTCORE] Session ID: " + sessionId);
        logger.info("The session id for the prompt is: {}", sessionId);

        return chatClient
                .prompt()
                .tools(new LongTermMemoryTool(memoryProvider, promptRequest.actor(), sessionId))
                .advisors(a -> a.param(ChatMemory.CONVERSATION_ID, conversationId(promptRequest, sessionId)))
                .user(promptRequest.prompt())
                .call()
                .content();
    }

    private String conversationId(PromptRequest promptRequest, String sessionId){
        return "%s:%s".formatted(promptRequest.actor(), sessionId);
    }
}
