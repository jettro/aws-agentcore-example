package dev.jettro.backend.service;

import dev.jettro.backend.model.InvokeRequest;
import dev.jettro.backend.model.InvokeResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.URL;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.UUID;

@Service
public class AgentCoreClientService {

    private static final Logger log = LoggerFactory.getLogger(AgentCoreClientService.class);

    @Value("${agentcore.runtime.endpoint}")
    private String agentCoreEndpoint;

    @Value("${agentcore.runtime.arn}")
    private String agentCoreRuntimeArn;

    private final HttpClient httpClient;

    public AgentCoreClientService() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(30))
                .build();
    }

    /**
     * Invokes the AgentCore Runtime with the user's prompt
     * 
     * @param request The invoke request with prompt and optional sessionId
     * @param bearerToken The JWT bearer token from the frontend
     * @param userId The user ID extracted from the token
     * @return The response from the agent
     */
    public InvokeResponse invokeAgent(InvokeRequest request, String bearerToken, String userId) {
        try {
            // Build the request body
            String requestBody = buildRequestBody(request);

            String sessionId = request.sessionId() != null ? request.sessionId() : "session-" + UUID.randomUUID();

            String escapedArn = URLEncoder.encode(agentCoreRuntimeArn, StandardCharsets.UTF_8);

            String uri = URI.create(agentCoreEndpoint + "/runtimes/" + escapedArn + "/invocations?qualifier=DEFAULT").toString();
            
            // Build HTTP request to AgentCore Runtime
            HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(uri))
                    .header("Content-Type", "application/json")
                    .header("Authorization", bearerToken)
                    .header("X-Amzn-Bedrock-AgentCore-Runtime-Session-Id", sessionId)
                    .timeout(Duration.ofSeconds(60))
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody));
            
            HttpRequest httpRequest = requestBuilder.build();
            
            log.info("Invoking AgentCore Runtime for user: {}", userId);
            
            // Send request
            HttpResponse<String> response = httpClient.send(httpRequest, 
                    HttpResponse.BodyHandlers.ofString());
            
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                log.info("AgentCore invocation successful. Status: {}", response.statusCode());
                
                // Parse response
                String agentResponse = parseAgentResponse(response.body());
                
                return new InvokeResponse(
                    agentResponse,
                    request.sessionId(),
                    userId
                );
            } else {
                log.error("AgentCore invocation failed. Status: {}, Body: {}", 
                         response.statusCode(), response.body());
                throw new RuntimeException("AgentCore invocation failed with status: " + response.statusCode());
            }
            
        } catch (IOException | InterruptedException e) {
            log.error("Error invoking AgentCore Runtime", e);
            Thread.currentThread().interrupt();
            throw new RuntimeException("Failed to invoke AgentCore Runtime: " + e.getMessage(), e);
        }
    }

    /**
     * Builds the request body for AgentCore Runtime
     */
    private String buildRequestBody(InvokeRequest request) {
        // Simple JSON construction - in production, use Jackson or similar
        StringBuilder json = new StringBuilder("{");
        json.append("\"prompt\":\"").append(escapeJson(request.prompt())).append("\"");
        
        if (request.sessionId() != null && !request.sessionId().isBlank()) {
            json.append(",\"sessionId\":\"").append(escapeJson(request.sessionId())).append("\"");
        }
        
        json.append("}");
        return json.toString();
    }

    /**
     * Parses the response from AgentCore Runtime
     * This is a simplified version - adjust based on actual AgentCore response format
     */
    private String parseAgentResponse(String responseBody) {
        // TODO: Parse actual AgentCore response format
        // For now, return the response body as-is
        // In production, use Jackson to parse JSON response
        log.debug("AgentCore raw response: {}", responseBody);
        return responseBody;
    }

    /**
     * Simple JSON string escaping
     */
    private String escapeJson(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("\\", "\\\\")
                   .replace("\"", "\\\"")
                   .replace("\n", "\\n")
                   .replace("\r", "\\r")
                   .replace("\t", "\\t");
    }
}
