package dev.jettro.backend.model;

import jakarta.validation.constraints.NotBlank;

public record InvokeRequest(
    @NotBlank(message = "Prompt is required")
    String prompt,
    
    String sessionId
) {}
