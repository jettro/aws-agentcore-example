package dev.jettro.agent;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.tool.annotation.Tool;

import java.util.List;

public class LongTermMemoryTool {
    private static final Logger logger = LoggerFactory.getLogger(LongTermMemoryTool.class);
    private final LongTermMemoryProvider memoryProvider;
    private final String actorId;
    private final String sessionId;

    public LongTermMemoryTool(LongTermMemoryProvider memoryProvider, String actorId, String sessionId) {
        this.memoryProvider = memoryProvider;
        this.actorId = actorId;
        this.sessionId = sessionId;
    }

    @Tool(description = "Searches for semantic similar memories based on the provided request")
    public List<String> searchSemanticMemory(String query) {
        logger.info("Searching semantic memory for: {}", query);
        return memoryProvider.searchSemanticMemories(new SearchMemoryRequest(query, actorId, sessionId));
    }

    @Tool(description = "Searches for summary in the memories based on the provided request")
    public List<String> searchSummaryMemory(String query) {
        logger.info("Searching summary memory for: {}", query);
        return memoryProvider.searchSummaryMemories(new SearchMemoryRequest(query, actorId, sessionId));
    }

    @Tool(description = "Searches for user preferences in the memories based on the provided request")
    public List<String> searchUserPreferenceMemory(String query) {
        logger.info("Searching user preference memory for: {}", query);
        return memoryProvider.searchUserPreferenceMemories(new SearchMemoryRequest(query, actorId, sessionId));
    }
}
