package dev.jettro.backend.model;

public record InvokeResponse(
    String response,
    String sessionId,
    String userId
) {}
