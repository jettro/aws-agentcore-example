package dev.jettro.agent;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import software.amazon.awssdk.services.bedrockagentcore.BedrockAgentCoreClient;
import software.amazon.awssdk.services.bedrockagentcorecontrol.BedrockAgentCoreControlClient;
import software.amazon.awssdk.services.bedrockagentcorecontrol.model.GetMemoryRequest;
import software.amazon.awssdk.services.bedrockagentcorecontrol.model.Memory;

import java.util.List;

@Deprecated(forRemoval = true)
public class LongTermMemoryProvider {
    private static final Logger log = LoggerFactory.getLogger(LongTermMemoryProvider.class);

    private final BedrockAgentCoreControlClient controlClient;
    private final BedrockAgentCoreClient coreClient;
    private final String memoryId;
    private LongTermMemoryStrategy summaryStrategy;
    private LongTermMemoryStrategy semanticStrategy;
    private LongTermMemoryStrategy userPreferenceStrategy;

    public LongTermMemoryProvider(BedrockAgentCoreControlClient controlClient, BedrockAgentCoreClient coreClient,
                                  String memoryId) {
        this.controlClient = controlClient;
        this.coreClient = coreClient;
        this.memoryId = memoryId;
    }

    public List<String> searchSemanticMemories(SearchMemoryRequest request) {
        return semanticStrategy != null ? semanticStrategy.searchMemory(request) : List.of();
    }

    public List<String> searchSummaryMemories(SearchMemoryRequest request) {
        return summaryStrategy != null ? summaryStrategy.searchMemory(request) : List.of();
    }

    public List<String> searchUserPreferenceMemories(SearchMemoryRequest request) {
        return userPreferenceStrategy != null ? userPreferenceStrategy.searchMemory(request) : List.of();
    }

    @PostConstruct
    public void loadStrategies() {
        var memory = loadExistingMemory();

        memory.strategies().forEach(strategy -> {
            log.info("Loaded strategy: {}", strategy.name());
            switch (strategy.type()) {
                case USER_PREFERENCE:
                    this.userPreferenceStrategy = new LongTermMemoryStrategy(strategy, memoryId, coreClient);
                    break;
                case SEMANTIC:
                    this.semanticStrategy = new LongTermMemoryStrategy(strategy, memoryId, coreClient);
                    break;
                case SUMMARIZATION:
                    this.summaryStrategy = new LongTermMemoryStrategy(strategy, memoryId, coreClient);
                    break;
                default:
                    log.warn("Unknown strategy: {}", strategy.name());
            }
        });
    }

    private Memory loadExistingMemory() {
        GetMemoryRequest getRequest = GetMemoryRequest.builder()
                .memoryId(this.memoryId)
                .build();

        Memory memory = controlClient.getMemory(getRequest).memory();
        log.info("Memory found: {}", memory.name());
        return memory;
    }

}
