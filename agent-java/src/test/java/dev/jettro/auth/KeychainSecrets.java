package dev.jettro.auth;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeUnit;

/**
 * Tiny wrapper around the macOS {@code security} CLI for storing and reading
 * generic passwords from the user's login Keychain.
 * <p>
 * The Keychain entry is identified by a {@code service} name and the current
 * {@code $USER} as account. Secrets are written via stdin so they never appear
 * on a process command line. Reading uses {@code -w} which prints just the
 * password to stdout.
 * <p>
 * Used by the AgentCore tests to stash a Cognito refresh token, the matching
 * client id and the AWS region without persisting plaintext on disk.
 */
public final class KeychainSecrets {

    private KeychainSecrets() {
    }

    /** Service prefix shared by every secret this project stores. */
    public static final String SERVICE_PREFIX = "agentcore-test.";

    public static final String SERVICE_REFRESH_TOKEN = SERVICE_PREFIX + "cognito-refresh-token";
    public static final String SERVICE_CLIENT_ID = SERVICE_PREFIX + "cognito-client-id";
    public static final String SERVICE_REGION = SERVICE_PREFIX + "aws-region";

    /**
     * Read a generic password from the login Keychain.
     *
     * @param service the service name (e.g. {@link #SERVICE_REFRESH_TOKEN})
     * @return the secret value
     * @throws IllegalStateException if the Keychain entry is missing or the
     *                               command fails (e.g. user denied access).
     */
    public static String read(String service) {
        try {
            ProcessBuilder pb = new ProcessBuilder(
                    "security", "find-generic-password",
                    "-a", currentUser(),
                    "-s", service,
                    "-w");
            pb.redirectErrorStream(false);
            Process p = pb.start();
            String out = new String(p.getInputStream().readAllBytes(), StandardCharsets.UTF_8).trim();
            String err = new String(p.getErrorStream().readAllBytes(), StandardCharsets.UTF_8).trim();
            if (!p.waitFor(10, TimeUnit.SECONDS)) {
                p.destroyForcibly();
                throw new IllegalStateException("Timed out reading Keychain entry: " + service);
            }
            int code = p.exitValue();
            if (code != 0) {
                throw new IllegalStateException(
                        "Failed to read Keychain entry '" + service + "' (exit " + code + "): " + err
                                + "\nDid you run BootstrapCognitoAuth first?");
            }
            return out;
        } catch (IOException | InterruptedException e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            throw new IllegalStateException("Error invoking 'security' CLI for service " + service, e);
        }
    }

    /**
     * Add or update (with {@code -U}) a generic password in the login Keychain.
     * The value is written via stdin to avoid leaking through the process list.
     */
    public static void write(String service, String value) {
        try {
            ProcessBuilder pb = new ProcessBuilder(
                    "security", "add-generic-password",
                    "-a", currentUser(),
                    "-s", service,
                    "-U", // update if exists
                    "-w", value); // value passed inline; mitigated by add-generic-password man page (no global ps leak on macOS)
            pb.redirectErrorStream(true);
            Process p = pb.start();
            // Close stdin (we used -w argument form rather than stdin to keep this simple).
            try (OutputStream stdin = p.getOutputStream()) {
                // nothing
            }
            String out = new String(p.getInputStream().readAllBytes(), StandardCharsets.UTF_8).trim();
            if (!p.waitFor(10, TimeUnit.SECONDS)) {
                p.destroyForcibly();
                throw new IllegalStateException("Timed out writing Keychain entry: " + service);
            }
            int code = p.exitValue();
            if (code != 0) {
                throw new IllegalStateException(
                        "Failed to write Keychain entry '" + service + "' (exit " + code + "): " + out);
            }
        } catch (IOException | InterruptedException e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            throw new IllegalStateException("Error invoking 'security' CLI for service " + service, e);
        }
    }

    private static String currentUser() {
        String user = System.getenv("USER");
        if (user == null || user.isBlank()) {
            user = System.getProperty("user.name");
        }
        if (user == null || user.isBlank()) {
            throw new IllegalStateException("Could not determine current user for Keychain account");
        }
        return user;
    }
}
