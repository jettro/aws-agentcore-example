package dev.jettro;

import dev.jettro.auth.CognitoTokenProvider;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

/**
 * Invokes a JWT-protected Bedrock AgentCore runtime over plain HTTPS using a
 * Cognito access token as the bearer credential.
 * <p>
 * <strong>Why not the AWS SDK?</strong> AWS docs explicitly state:
 * <em>"If you're integrating your agent with OAuth, you can't use the AWS SDK
 * to call InvokeAgentRuntime. Instead, make a HTTPS request."</em> The SDK's
 * SigV4 signer would clash with the runtime's OAuth authorizer and produce an
 * {@code Authorization method mismatch} error.
 * <p>
 * Prerequisite: run {@link BootstrapCognitoAuth} once to seed the macOS
 * Keychain with a refresh token. After that, this test mints a fresh access
 * token on every run with no password prompt.
 */
public class RuntimeTestMemory {

    /** Full ARN of the OAuth-protected agent runtime. */
    private static final String AGENT_RUNTIME_ARN =
            "arn:aws:bedrock-agentcore:eu-west-1:778270100068:runtime/bedrock_agent_runtime-Lc8XuS252H";

    /** Endpoint qualifier; "DEFAULT" maps to the latest published endpoint. */
    private static final String QUALIFIER = "DEFAULT";

    /** Must be 33+ characters per the AgentCore data plane contract. */
    private static final String SESSION_ID = "session-413e123e-c8c7-45a2-8d1c-5939c0e33b1f";

    private static final String PAYLOAD = "{\"prompt\": \"This year was the first year we rented a buscamper. "
            + "We loved the freedom. We visited Denmark and Switserland. What country do you suggest for next year?\", "
            + "\"actor\": \"jettro\"}";

    public static void main(String[] args) throws Exception {
        // 1. Mint a fresh Cognito access token from the refresh token in Keychain.
        CognitoTokenProvider tokenProvider = CognitoTokenProvider.fromKeychain();
        String accessToken = tokenProvider.fetchAccessToken();
        System.out.println("Got Cognito access token (" + accessToken.length() + " chars).");

        // 2. Build the AgentCore data plane URL. The ARN must be URL-encoded.
        String region = tokenProvider.region().id();
        String encodedArn = URLEncoder.encode(AGENT_RUNTIME_ARN, StandardCharsets.UTF_8);
        URI endpoint = URI.create(
                "https://bedrock-agentcore." + region + ".amazonaws.com"
                        + "/runtimes/" + encodedArn
                        + "/invocations?qualifier=" + QUALIFIER);
        System.out.println("POST " + endpoint);

        // 3. POST the payload with Authorization: Bearer + the runtime session header.
        HttpClient http = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();

        HttpRequest request = HttpRequest.newBuilder(endpoint)
                .timeout(Duration.ofMinutes(2))
                .header("Authorization", "Bearer " + accessToken)
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .header("X-Amzn-Bedrock-AgentCore-Runtime-Session-Id", SESSION_ID)
                .POST(HttpRequest.BodyPublishers.ofString(PAYLOAD, StandardCharsets.UTF_8))
                .build();

        HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));

        System.out.println("HTTP " + response.statusCode());
        if (response.statusCode() / 100 != 2) {
            System.err.println("Error response body: " + response.body());
            response.headers().firstValue("www-authenticate")
                    .ifPresent(h -> System.err.println("WWW-Authenticate: " + h));
            System.exit(1);
        }
        System.out.println("Agent Response: " + response.body());
        System.out.println("Session: " + SESSION_ID);
    }
}
