package dev.jettro.agent;

import software.amazon.awssdk.services.bedrockagentcore.BedrockAgentCoreClient;
import software.amazon.awssdk.services.bedrockagentcore.model.*;
import software.amazon.awssdk.services.bedrockagentcorecontrol.model.MemoryStrategy;

import java.util.List;

@Deprecated(forRemoval = true)
public class LongTermMemoryStrategy {
    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(LongTermMemoryStrategy.class);

    private final String memoryId;
    private final BedrockAgentCoreClient coreClient;
    private final String memoryStrategyId;
    private final String namespace;

    public LongTermMemoryStrategy(MemoryStrategy memoryStrategy, String memoryId, BedrockAgentCoreClient coreClient) {
        this.memoryId = memoryId;
        this.coreClient = coreClient;
        this.memoryStrategyId = memoryStrategy.strategyId();

        if (memoryStrategy.hasNamespaces()) {
            memoryStrategy.namespaces().forEach(namespace -> logger.info("Memory strategy {} has namespace {}", memoryStrategyId, namespace));
            this.namespace = memoryStrategy.namespaces().get(0);
        } else {
            logger.warn("Memory strategy {} does not have any namespaces", memoryStrategyId);
            this.namespace = "/strategies/{memoryStrategyId}/actors/{actorId}";
        }
    }

    public List<String> searchMemory(SearchMemoryRequest request) {
        SearchCriteria searchCriteria = SearchCriteria.builder()
                .memoryStrategyId(memoryStrategyId)
                .searchQuery(request.query())
                .build();

        RetrieveMemoryRecordsRequest retrieveMemoryRecordsRequest = RetrieveMemoryRecordsRequest.builder()
                .memoryId(memoryId)
                .maxResults(request.maxResults())
                .namespace(buildNamespace(request))
                .searchCriteria(searchCriteria)
                .build();
        RetrieveMemoryRecordsResponse retrieveMemoryRecordsResponse = coreClient.retrieveMemoryRecords(retrieveMemoryRecordsRequest);

        if (!retrieveMemoryRecordsResponse.hasMemoryRecordSummaries()) {
            logger.info("No memory records found for query: {}", request.query());
            return List.of();
        }

        return retrieveMemoryRecordsResponse.memoryRecordSummaries().stream()
                .map(item -> {
                    logger.info("Memory record content: {}", item.content().text());
                    return item.content().text();
                })
                .toList();
    }

    public String buildNamespace(SearchMemoryRequest request) {
        var result = namespace.replace("{actorId}", request.actorId());
        result = result.replace("{memoryStrategyId}", memoryStrategyId);
        if (request.sessionId().isPresent()) {
            result = result.replace("{sessionId}", request.sessionId().get());
        }
        logger.debug("Namespace: {}", result);
        return result;
    }
}
