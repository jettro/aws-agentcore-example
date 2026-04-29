package dev.jettro.auth;

import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AuthFlowType;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AuthenticationResultType;
import software.amazon.awssdk.services.cognitoidentityprovider.model.InitiateAuthRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.InitiateAuthResponse;

import java.util.Map;

/**
 * Mints fresh Cognito access tokens for a given app client by exchanging a
 * stored refresh token via {@code REFRESH_TOKEN_AUTH}.
 * <p>
 * The refresh token, app client id and region are read from the macOS Keychain
 * (see {@link KeychainSecrets}). To populate them once, run
 * {@link dev.jettro.BootstrapCognitoAuth}.
 * <p>
 * Cognito refresh tokens default to ~30 days; subsequent test runs do not need
 * the user's password.
 */
public final class CognitoTokenProvider {

    private final String clientId;
    private final String refreshToken;
    private final Region region;

    private CognitoTokenProvider(String clientId, String refreshToken, Region region) {
        this.clientId = clientId;
        this.refreshToken = refreshToken;
        this.region = region;
    }

    /** Build a provider from values stored in the macOS Keychain. */
    public static CognitoTokenProvider fromKeychain() {
        String clientId = KeychainSecrets.read(KeychainSecrets.SERVICE_CLIENT_ID);
        String refreshToken = KeychainSecrets.read(KeychainSecrets.SERVICE_REFRESH_TOKEN);
        String regionStr = KeychainSecrets.read(KeychainSecrets.SERVICE_REGION);
        return new CognitoTokenProvider(clientId, refreshToken, Region.of(regionStr));
    }

    /**
     * Call Cognito's {@code InitiateAuth} with {@code REFRESH_TOKEN_AUTH} and
     * return the freshly issued access token. The access token's
     * {@code client_id} claim is what AgentCore validates against
     * {@code allowedClients}.
     */
    public String fetchAccessToken() {
        try (CognitoIdentityProviderClient cognito = CognitoIdentityProviderClient.builder()
                .region(region)
                .build()) {

            InitiateAuthRequest request = InitiateAuthRequest.builder()
                    .clientId(clientId)
                    .authFlow(AuthFlowType.REFRESH_TOKEN_AUTH)
                    .authParameters(Map.of("REFRESH_TOKEN", refreshToken))
                    .build();

            InitiateAuthResponse response = cognito.initiateAuth(request);
            AuthenticationResultType result = response.authenticationResult();
            if (result == null || result.accessToken() == null) {
                throw new IllegalStateException(
                        "Cognito did not return an access token. Challenge: " + response.challengeNameAsString());
            }
            return result.accessToken();
        }
    }

    public Region region() {
        return region;
    }
}
