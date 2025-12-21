package dev.jettro;

import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.bedrockagentcore.BedrockAgentCoreClient;
import software.amazon.awssdk.services.bedrockagentcore.model.InvokeAgentRuntimeRequest;
import software.amazon.awssdk.services.bedrockagentcore.model.InvokeAgentRuntimeResponse;
import software.amazon.awssdk.utils.IoUtils;

import java.io.IOException;

public class RuntimeTestMemory {
    public static void main(String[] args) {
        BedrockAgentCoreClient client = BedrockAgentCoreClient.builder()
                .region(Region.EU_WEST_1)
                .build();

        String payload = "{\"prompt\": \"What would be a good name for my favourite animal?\", \"actor\": \"jettro\"}";
        String sessionId = "session-413e123e-c8c7-45a2-8d1c-5939c0e33b1e";

        InvokeAgentRuntimeRequest request = InvokeAgentRuntimeRequest.builder()
                .agentRuntimeArn("arn:aws:bedrock-agentcore:eu-west-1:778270100068:runtime/bedrock_agent_runtime-Lc8XuS252H")
                .runtimeSessionId(sessionId) // Must be 33+ char. Every new SessionId will create a new MicroVM
                .payload(SdkBytes.fromUtf8String(payload))
                .build();


        try (ResponseInputStream<InvokeAgentRuntimeResponse> responseStream = client.invokeAgentRuntime(request)) {
            String responseData = IoUtils.toUtf8String(responseStream);
            System.out.println("Agent Response: " + responseData);

            System.out.println(sessionId);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
