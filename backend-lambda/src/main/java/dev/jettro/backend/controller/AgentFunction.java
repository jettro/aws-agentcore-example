package dev.jettro.backend.controller;

import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.jettro.backend.model.ErrorResponse;
import dev.jettro.backend.model.InvokeRequest;
import dev.jettro.backend.model.InvokeResponse;
import dev.jettro.backend.service.AgentCoreClientService;
import dev.jettro.backend.service.TokenValidatorService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Configuration
public class AgentFunction {

    private static final Logger log = LoggerFactory.getLogger(AgentFunction.class);

    private final TokenValidatorService tokenValidator;
    private final AgentCoreClientService agentCoreClient;
    private final ObjectMapper objectMapper;

    public AgentFunction(TokenValidatorService tokenValidator,
                        AgentCoreClientService agentCoreClient,
                        ObjectMapper objectMapper) {
        this.tokenValidator = tokenValidator;
        this.agentCoreClient = agentCoreClient;
        this.objectMapper = objectMapper;
    }

    @Bean
    public Function<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent> invokeAgent() {
        return request -> {
            try {
                log.info("Received agent invocation request");

                // Extract Authorization header
                Map<String, String> headers = request.getHeaders();
                if (headers == null || !headers.containsKey("Authorization")) {
                    return createErrorResponse(401, "Missing Authorization header");
                }

                String bearerToken = headers.get("Authorization");
                
                // Validate token and get user ID
                String userId;
                try {
                    userId = tokenValidator.validateTokenAndGetUserId(bearerToken);
                } catch (SecurityException e) {
                    log.error("Token validation failed", e);
                    return createErrorResponse(401, "Invalid or expired token: " + e.getMessage());
                }

                // Parse request body
                InvokeRequest invokeRequest;
                try {
                    invokeRequest = objectMapper.readValue(request.getBody(), InvokeRequest.class);
                } catch (Exception e) {
                    log.error("Failed to parse request body", e);
                    return createErrorResponse(400, "Invalid request body: " + e.getMessage());
                }

                // Validate request
                if (invokeRequest.prompt() == null || invokeRequest.prompt().isBlank()) {
                    return createErrorResponse(400, "Prompt is required");
                }

                // Invoke AgentCore Runtime
                try {
                    InvokeResponse response = agentCoreClient.invokeAgent(invokeRequest, bearerToken, userId);
                    
                    // Create successful response
                    String responseBody = objectMapper.writeValueAsString(response);
                    return createSuccessResponse(200, responseBody);
                    
                } catch (Exception e) {
                    log.error("Failed to invoke AgentCore Runtime", e);
                    return createErrorResponse(500, "Failed to invoke agent: " + e.getMessage());
                }

            } catch (Exception e) {
                log.error("Unexpected error processing request", e);
                return createErrorResponse(500, "Internal server error: " + e.getMessage());
            }
        };
    }

    /**
     * Creates a success response with CORS headers
     */
    private APIGatewayProxyResponseEvent createSuccessResponse(int statusCode, String body) {
        APIGatewayProxyResponseEvent response = new APIGatewayProxyResponseEvent();
        response.setStatusCode(statusCode);
        response.setBody(body);
        response.setHeaders(createCorsHeaders());
        return response;
    }

    /**
     * Creates an error response with CORS headers
     */
    private APIGatewayProxyResponseEvent createErrorResponse(int statusCode, String message) {
        try {
            ErrorResponse errorResponse = new ErrorResponse(message, "Error", statusCode);
            String body = objectMapper.writeValueAsString(errorResponse);
            
            APIGatewayProxyResponseEvent response = new APIGatewayProxyResponseEvent();
            response.setStatusCode(statusCode);
            response.setBody(body);
            response.setHeaders(createCorsHeaders());
            return response;
        } catch (Exception e) {
            log.error("Failed to serialize error response", e);
            APIGatewayProxyResponseEvent response = new APIGatewayProxyResponseEvent();
            response.setStatusCode(statusCode);
            response.setBody("{\"message\":\"" + message.replace("\"", "\\\"") + "\"}");
            response.setHeaders(createCorsHeaders());
            return response;
        }
    }

    /**
     * Creates CORS headers for API Gateway responses
     */
    private Map<String, String> createCorsHeaders() {
        Map<String, String> headers = new HashMap<>();
        headers.put("Content-Type", "application/json");
        headers.put("Access-Control-Allow-Origin", "*"); // TODO: Restrict in production
        headers.put("Access-Control-Allow-Headers", "Content-Type,Authorization");
        headers.put("Access-Control-Allow-Methods", "POST,OPTIONS");
        return headers;
    }
}
