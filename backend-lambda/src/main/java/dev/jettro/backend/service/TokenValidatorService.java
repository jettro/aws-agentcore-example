package dev.jettro.backend.service;

import com.nimbusds.jose.JWSVerifier;
import com.nimbusds.jose.crypto.RSASSAVerifier;
import com.nimbusds.jose.jwk.JWK;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URL;
import java.util.Date;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class TokenValidatorService {

    private static final Logger log = LoggerFactory.getLogger(TokenValidatorService.class);

    @Value("${aws.cognito.userPoolId}")
    private String userPoolId;

    @Value("${aws.region}")
    private String awsRegion;

    private final Map<String, RSAKey> jwkCache = new ConcurrentHashMap<>();
    private JWKSet jwkSet;

    /**
     * Validates a JWT token from Cognito and returns the user's subject (sub) claim
     */
    public String validateTokenAndGetUserId(String token) {
        try {
            // Remove "Bearer " prefix if present
            String jwt = token.startsWith("Bearer ") ? token.substring(7) : token;
            
            SignedJWT signedJWT = SignedJWT.parse(jwt);
            
            // Get the key ID from the token header
            String keyId = signedJWT.getHeader().getKeyID();
            
            // Get the public key from JWKS
            RSAKey rsaKey = getRSAKey(keyId);
            
            // Verify the signature
            JWSVerifier verifier = new RSASSAVerifier(rsaKey);
            if (!signedJWT.verify(verifier)) {
                throw new SecurityException("Invalid token signature");
            }
            
            // Get claims
            JWTClaimsSet claims = signedJWT.getJWTClaimsSet();
            
            // Validate issuer
            String expectedIssuer = String.format("https://cognito-idp.%s.amazonaws.com/%s", awsRegion, userPoolId);
            if (!expectedIssuer.equals(claims.getIssuer())) {
                throw new SecurityException("Invalid token issuer");
            }
            
            // Validate expiration
            Date expirationTime = claims.getExpirationTime();
            if (expirationTime == null || expirationTime.before(new Date())) {
                throw new SecurityException("Token has expired");
            }
            
            // Validate token use (should be "access" for access tokens)
            String tokenUse = claims.getStringClaim("token_use");
            if (!"access".equals(tokenUse)) {
                throw new SecurityException("Invalid token use claim");
            }
            
            // Return the subject (user ID)
            String userId = claims.getSubject();
            log.debug("Token validated successfully for user: {}", userId);
            return userId;
            
        } catch (Exception e) {
            log.error("Token validation failed", e);
            throw new SecurityException("Token validation failed: " + e.getMessage(), e);
        }
    }

    /**
     * Retrieves RSA public key from Cognito JWKS endpoint
     */
    private RSAKey getRSAKey(String keyId) throws Exception {
        // Check cache first
        RSAKey cachedKey = jwkCache.get(keyId);
        if (cachedKey != null) {
            return cachedKey;
        }
        
        // Fetch JWKS if not already loaded
        if (jwkSet == null) {
            String jwksUrl = String.format("https://cognito-idp.%s.amazonaws.com/%s/.well-known/jwks.json", 
                                          awsRegion, userPoolId);
            log.info("Fetching JWKS from: {}", jwksUrl);
            jwkSet = JWKSet.load(new URL(jwksUrl));
        }
        
        // Find the key with matching keyId
        JWK jwk = jwkSet.getKeyByKeyId(keyId);
        if (jwk == null) {
            // Reload JWKS in case keys have been rotated
            String jwksUrl = String.format("https://cognito-idp.%s.amazonaws.com/%s/.well-known/jwks.json", 
                                          awsRegion, userPoolId);
            jwkSet = JWKSet.load(new URL(jwksUrl));
            jwk = jwkSet.getKeyByKeyId(keyId);
            
            if (jwk == null) {
                throw new SecurityException("Unable to find matching key in JWKS");
            }
        }
        
        RSAKey rsaKey = jwk.toRSAKey();
        jwkCache.put(keyId, rsaKey);
        return rsaKey;
    }
}
