package dev.jettro.backend.model;

import java.time.Instant;

public record ErrorResponse(
    String message,
    String error,
    int status,
    Instant timestamp
) {
    public ErrorResponse(String message, String error, int status) {
        this(message, error, status, Instant.now());
    }
}
