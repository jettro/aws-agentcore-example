package dev.jettro.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.nativex.hint.TypeHint;

@SpringBootApplication
@TypeHint(types = {
    com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent.class,
    com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent.class
})
public class BackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
    }
}
