package dev.jettro.agent;

import java.util.Optional;

/**
 * Request object to search for memories
 * @param query The quesry string to search related memories for.
 * @param actorId The actor id to search memories for.
 * @param sessionId The session id to search memories for. This is an optional parameter.
 * @param maxResults The maximum number of results to return. This is an optional parameter.
 */
public record SearchMemoryRequest(String query, String actorId, Optional<String> sessionId, int maxResults) {
    private static final int DEFAULT_MAX_RESULTS = 4;

    public SearchMemoryRequest {
        if (maxResults <= 0) {
            maxResults = DEFAULT_MAX_RESULTS;
        }
    }

    public SearchMemoryRequest(String query, String actorId) {
        this(query, actorId, Optional.empty(), DEFAULT_MAX_RESULTS);
    }

    public SearchMemoryRequest(String query, String actorId, String sessionId) {
        this(query, actorId, Optional.ofNullable(sessionId), DEFAULT_MAX_RESULTS);
    }

    public SearchMemoryRequest(String query, String actorId, String sessionId, int maxResults) {
        this(query, actorId, Optional.ofNullable(sessionId), maxResults);
    }
}
