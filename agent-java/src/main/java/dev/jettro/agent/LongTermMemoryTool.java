package dev.jettro.agent;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springaicommunity.agentcore.memory.AgentCoreLongTermMemoryProperties;
import org.springaicommunity.agentcore.memory.AgentCoreLongTermMemoryRetriever;
import org.springaicommunity.agentcore.memory.AgentCoreLongTermMemoryScope;
import org.springframework.ai.tool.annotation.Tool;

import java.util.List;

public class LongTermMemoryTool {
    private static final Logger logger = LoggerFactory.getLogger(LongTermMemoryTool.class);
    private final AgentCoreLongTermMemoryRetriever memoryProvider;
    private final String actorId;
    private final String sessionId;

    private final String userPreferenceStrategyId;
    private final String semanticStrategyId;
    private final String summaryStrategyId;

    public LongTermMemoryTool(AgentCoreLongTermMemoryRetriever memoryProvider,
                              String actorId,
                              String sessionId,
                              AgentCoreLongTermMemoryProperties config) {
        this.memoryProvider = memoryProvider;
        this.actorId = actorId;
        this.sessionId = sessionId;

        this.userPreferenceStrategyId = config.userPreference().strategyId();
        this.semanticStrategyId = config.semantic().strategyId();
        this.summaryStrategyId = config.summary().strategyId();
    }

    @Tool(description = "Searches for semantic similar memories based on the provided request")
    public List<String> searchSemanticMemory(String query) {
        logger.info("Searching semantic memory for: {}", query);
        return memoryProvider.searchMemories(semanticStrategyId, actorId, query, 10).stream()
                .map(AgentCoreLongTermMemoryRetriever.MemoryRecord::content)
                .toList();
    }

    @Tool(description = "Searches for summary in the memories based on the provided request")
    public List<String> searchSummaryMemory(String query) {
        logger.info("Searching summary memory for: {}", query);
        return memoryProvider.searchSummaries(this.summaryStrategyId, actorId, this.sessionId, query, 10, AgentCoreLongTermMemoryScope.SESSION).stream()
                .map(AgentCoreLongTermMemoryRetriever.MemoryRecord::content)
                .toList();
    }

    @Tool(description = "Searches for user preferences in the memories based on the provided request")
    public List<String> searchUserPreferenceMemory(String query) {
        logger.info("Searching user preference memory for: {}", query);
        return memoryProvider.listMemories(this.userPreferenceStrategyId, this.actorId).stream()
                .map(AgentCoreLongTermMemoryRetriever.MemoryRecord::content)
                .toList();
    }
}
