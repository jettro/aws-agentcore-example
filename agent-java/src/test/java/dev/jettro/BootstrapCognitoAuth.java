package dev.jettro;

import dev.jettro.auth.KeychainSecrets;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AuthFlowType;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AuthenticationResultType;
import software.amazon.awssdk.services.cognitoidentityprovider.model.InitiateAuthRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.InitiateAuthResponse;

import java.io.BufferedReader;
import java.io.Console;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Map;

/**
 * One-time bootstrap that performs an interactive Cognito sign-in and stashes
 * the resulting <strong>refresh token</strong> in the macOS Keychain so that
 * subsequent test runs ({@link RuntimeTestMemory}) can mint fresh access tokens
 * via {@code REFRESH_TOKEN_AUTH} without needing the user's password again.
 * <p>
 * Usage:
 * <pre>
 *   mvn -pl agent-java test-compile
 *   mvn -pl agent-java exec:java \
 *     -Dexec.classpathScope=test \
 *     -Dexec.mainClass=dev.jettro.BootstrapCognitoAuth \
 *     -Dexec.args="&lt;cognitoClientId&gt; &lt;region&gt;"
 * </pre>
 * Or pass values via env vars {@code COGNITO_CLIENT_ID} and {@code AWS_REGION}.
 * <p>
 * What it stores in the Keychain (account = current {@code $USER}):
 * <ul>
 *     <li>{@code agentcore-test.cognito-client-id}</li>
 *     <li>{@code agentcore-test.cognito-refresh-token}</li>
 *     <li>{@code agentcore-test.aws-region}</li>
 * </ul>
 * The user's password is read with {@link Console#readPassword} (no echo) and
 * is never stored — only the refresh token is persisted.
 */
public class BootstrapCognitoAuth {

    public static void main(String[] args) throws Exception {
        String clientId = arg(args, 0, System.getenv("COGNITO_CLIENT_ID"));
        String regionStr = arg(args, 1, System.getenv("AWS_REGION"));

        if (clientId == null || clientId.isBlank()) {
            System.err.println("Missing Cognito app client id.");
            System.err.println("Pass it as the first argument or set COGNITO_CLIENT_ID.");
            System.err.println("\nFind it via:");
            System.err.println("  aws cloudformation describe-stacks \\");
            System.err.println("    --stack-name <CognitoStackName> --profile personal \\");
            System.err.println("    --query \"Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue\" \\");
            System.err.println("    --output text");
            System.exit(2);
        }
        if (regionStr == null || regionStr.isBlank()) {
            regionStr = "eu-west-1";
            System.out.println("No region provided; defaulting to " + regionStr);
        }
        Region region = Region.of(regionStr);

        String username = readLine("Cognito username (email): ");
        char[] passwordChars = readPassword("Cognito password (input hidden): ");
        String password = new String(passwordChars);
        // Best effort wipe.
        java.util.Arrays.fill(passwordChars, '\0');

        System.out.println("Authenticating against Cognito in " + region + " ...");
        String refreshToken;
        try (CognitoIdentityProviderClient cognito = CognitoIdentityProviderClient.builder()
                .region(region)
                .build()) {

            InitiateAuthRequest req = InitiateAuthRequest.builder()
                    .clientId(clientId)
                    .authFlow(AuthFlowType.USER_PASSWORD_AUTH)
                    .authParameters(Map.of(
                            "USERNAME", username,
                            "PASSWORD", password))
                    .build();

            InitiateAuthResponse resp = cognito.initiateAuth(req);
            AuthenticationResultType result = resp.authenticationResult();
            if (result == null) {
                throw new IllegalStateException(
                        "Cognito returned a challenge instead of tokens: " + resp.challengeNameAsString()
                                + ". Resolve it (e.g. set permanent password) and re-run.");
            }
            refreshToken = result.refreshToken();
            if (refreshToken == null || refreshToken.isBlank()) {
                throw new IllegalStateException(
                        "Cognito did not return a refresh token. Make sure ALLOW_REFRESH_TOKEN_AUTH is enabled on the app client.");
            }
        }

        // Wipe password from heap as best as we can.
        password = null;
        //noinspection UnusedAssignment
        password = "x";

        KeychainSecrets.write(KeychainSecrets.SERVICE_CLIENT_ID, clientId);
        KeychainSecrets.write(KeychainSecrets.SERVICE_REGION, regionStr);
        KeychainSecrets.write(KeychainSecrets.SERVICE_REFRESH_TOKEN, refreshToken);

        System.out.println();
        System.out.println("✅ Stored in macOS Keychain (account=" + System.getenv("USER") + "):");
        System.out.println("   - " + KeychainSecrets.SERVICE_CLIENT_ID);
        System.out.println("   - " + KeychainSecrets.SERVICE_REGION);
        System.out.println("   - " + KeychainSecrets.SERVICE_REFRESH_TOKEN);
        System.out.println();
        System.out.println("You can now run RuntimeTestMemory without entering a password.");
        System.out.println("Refresh tokens last ~30 days by default; re-run this bootstrap when it expires.");
    }

    private static String arg(String[] args, int idx, String fallback) {
        if (args != null && args.length > idx && args[idx] != null && !args[idx].isBlank()) {
            return args[idx];
        }
        return fallback;
    }

    private static String readLine(String prompt) throws Exception {
        Console console = System.console();
        if (console != null) {
            String s = console.readLine(prompt);
            if (s == null) {
                throw new IllegalStateException("EOF on stdin while reading: " + prompt);
            }
            return s.trim();
        }
        // Fallback (e.g. running under an IDE without a real console).
        System.out.print(prompt);
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8));
        String s = br.readLine();
        if (s == null) {
            throw new IllegalStateException("EOF on stdin while reading: " + prompt);
        }
        return s.trim();
    }

    private static char[] readPassword(String prompt) throws Exception {
        Console console = System.console();
        if (console != null) {
            char[] pw = console.readPassword(prompt);
            if (pw == null) {
                throw new IllegalStateException("EOF on stdin while reading password");
            }
            return pw;
        }
        // No real console (IDE). Fall back to visible input - warn the user.
        System.out.println("WARNING: no real console attached; password input will be visible.");
        System.out.print(prompt);
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8));
        String s = br.readLine();
        if (s == null) {
            throw new IllegalStateException("EOF on stdin while reading password");
        }
        return s.toCharArray();
    }
}
