# agent-java

Java-based Bedrock AgentCore runtime plus local helpers for invoking the
deployed runtime from your laptop.

## What's in here

- `src/main/...` — the Spring Boot agent that runs inside the AgentCore
  Runtime container.
- `src/test/java/dev/jettro/RuntimeTestMemory.java` — local invoker that calls
  the deployed (OAuth-protected) runtime over plain HTTPS using a Cognito
  bearer token.
- `src/test/java/dev/jettro/RunLongTermMemory.java` — local helper that talks
  to AgentCore Memory using SigV4 (your AWS profile).
- `src/test/java/dev/jettro/auth/` — small utilities used by the local
  invoker:
  - `KeychainSecrets` — read/write generic passwords in the macOS login
    Keychain via the `security` CLI.
  - `CognitoTokenProvider` — exchanges a stored refresh token for a fresh
    Cognito access token (`REFRESH_TOKEN_AUTH`).
- `src/test/java/dev/jettro/BootstrapCognitoAuth.java` — one-time helper that
  performs an interactive Cognito sign-in and stores the resulting refresh
  token, client id, and region in the Keychain.
- `bootstrap-cognito.sh` — wrapper that runs `BootstrapCognitoAuth` with a
  real terminal (so the password prompt is hidden).

## Why this is more than `mvn exec:java` with an AWS profile

The deployed runtime is configured with **OAuth/JWT inbound auth** (a Cognito
authorizer). AWS documents this constraint explicitly:

> If you're integrating your agent with OAuth, you can't use the AWS SDK to
> call `InvokeAgentRuntime`. Instead, make a HTTPS request.

So `RuntimeTestMemory` does **not** use `BedrockAgentCoreClient`. It uses
`java.net.http.HttpClient` to POST directly to the AgentCore data-plane
endpoint with an `Authorization: Bearer <jwt>` header. Trying to use the SDK
results in:

```
AccessDeniedException: Authorization method mismatch.
The agent is configured for a different authorization method
than what was used in your request.
```

## Architecture of the test

```
┌─────────────────────┐                      ┌──────────────────────┐
│  RuntimeTestMemory  │                      │ Cognito User Pool    │
│  (your laptop)      │  REFRESH_TOKEN_AUTH  │ (eu-west-1)          │
│                     │ ───────────────────► │                      │
│  CognitoTokenProv.  │ ◄─────────────────── │  AccessToken (JWT)   │
└─────────┬───────────┘                      └──────────────────────┘
          │ Authorization: Bearer <JWT>
          │ Content-Type: application/json
          │ X-Amzn-Bedrock-AgentCore-Runtime-Session-Id: ...
          ▼
┌──────────────────────────────────────────────────────────────────┐
│ POST https://bedrock-agentcore.eu-west-1.amazonaws.com           │
│        /runtimes/<urlEncodedArn>/invocations?qualifier=DEFAULT   │
└──────────────────────────────────────────────────────────────────┘
```

Three values live in the macOS Keychain (account = `$USER`):

| Service                                  | Contents                          |
|------------------------------------------|-----------------------------------|
| `agentcore-test.cognito-client-id`       | Cognito app client id             |
| `agentcore-test.cognito-refresh-token`   | Cognito refresh token (~30 days)  |
| `agentcore-test.aws-region`              | e.g. `eu-west-1`                  |

Your password is **never** stored — only the refresh token is.

## Prerequisites

- macOS (uses the `security` CLI). Linux/Windows would need a different
  secret store.
- Java 21 + Maven 3.9.
- AWS CLI configured (`aws configure sso` or similar) under the profile you
  use for this project.
- The Cognito app client must have `ALLOW_USER_PASSWORD_AUTH` enabled (just
  for the one-time bootstrap; SRP-only clients won't work with this helper).
  In the AWS console open the user pool → App clients → your client → tick
  **Sign in with username and password**.

## One-time bootstrap

```bash path=null start=null
cd agent-java

# Look up the Cognito app client id (output of the Cognito stack)
aws cloudformation describe-stacks \
  --stack-name <CognitoStackName> --profile personal \
  --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue" \
  --output text

# Run the bootstrap. You'll be prompted for username and (hidden) password.
./bootstrap-cognito.sh <COGNITO_CLIENT_ID> eu-west-1
```

The bootstrap signs in once (`USER_PASSWORD_AUTH`) and saves the refresh
token + client id + region in the Keychain. Refresh tokens default to ~30
days; re-run the bootstrap when you start getting
`NotAuthorizedException: Refresh Token has expired`.

### Inspecting / clearing the Keychain entries

```bash path=null start=null
# Show metadata (does NOT print the secret)
security find-generic-password -a "$USER" -s agentcore-test.cognito-refresh-token

# Print the actual secret to stdout (use sparingly)
security find-generic-password -a "$USER" -s agentcore-test.cognito-refresh-token -w

# Delete (e.g. when handing off the machine)
security delete-generic-password -a "$USER" -s agentcore-test.cognito-refresh-token
security delete-generic-password -a "$USER" -s agentcore-test.cognito-client-id
security delete-generic-password -a "$USER" -s agentcore-test.aws-region
```

### Bootstrapping without `BootstrapCognitoAuth`

If you ever delete the Java helper, you can populate the Keychain manually
using the AWS CLI plus `security`:

```bash path=null start=null
USER_POOL_ID=<USER_POOL_ID>
CLIENT_ID=<COGNITO_CLIENT_ID>
USERNAME=<your-cognito-username>
REGION=eu-west-1

# Authenticate once and capture the refresh token
REFRESH_TOKEN=$(aws cognito-idp admin-initiate-auth \
  --user-pool-id "$USER_POOL_ID" \
  --client-id "$CLIENT_ID" \
  --auth-flow ADMIN_USER_PASSWORD_AUTH \
  --auth-parameters USERNAME="$USERNAME",PASSWORD="$(read -s -p 'Password: ' p; echo "$p")" \
  --profile personal --region "$REGION" \
  --query 'AuthenticationResult.RefreshToken' --output text)

# Stash the three values in the Keychain
security add-generic-password -U -a "$USER" -s agentcore-test.cognito-client-id     -w "$CLIENT_ID"
security add-generic-password -U -a "$USER" -s agentcore-test.aws-region            -w "$REGION"
security add-generic-password -U -a "$USER" -s agentcore-test.cognito-refresh-token -w "$REFRESH_TOKEN"
```

(`ADMIN_USER_PASSWORD_AUTH` requires `ALLOW_ADMIN_USER_PASSWORD_AUTH` on the
client; otherwise use `initiate-auth` with `USER_PASSWORD_AUTH`.)

## Running the runtime test

After a successful bootstrap, no more password prompts:

```bash path=null start=null
cd agent-java
mvn exec:java -Dexec.mainClass=dev.jettro.RuntimeTestMemory
```

The `exec-maven-plugin` is pinned to **3.5.0** in `pom.xml` and pre-set to
`classpathScope=test`, so no extra `-D…` flags are needed. Each run mints a
fresh access token via `REFRESH_TOKEN_AUTH` and POSTs the prompt to the
runtime.

## Running the memory test

`RunLongTermMemory` does not need OAuth — it uses SigV4 with your AWS
profile.

```bash path=null start=null
cd agent-java
mvn exec:java -Dexec.mainClass=dev.jettro.RunLongTermMemory \
  -Dexec.args="<NestedAgentCoreStackName> personal"
```

## Troubleshooting

### `NotAuthorizedException: USER_PASSWORD_AUTH flow not enabled for this client`
Enable **Sign in with username and password** on the Cognito app client (or
redeploy the Cognito stack if its CDK has `userPassword: true`).

### `AccessDeniedException: Authorization method mismatch`
You're calling AgentCore via the AWS SDK against an OAuth-configured runtime.
The HTTPS path in `RuntimeTestMemory` avoids this; double-check you ran
`RuntimeTestMemory` and not the old SDK-based code.

### `A required class was missing ... software/amazon/awssdk/core/exception/SdkDiagnostics`
You're picking up `exec-maven-plugin` 3.6.x, which has a classloader
regression. The pom pins **3.5.0**; make sure you didn't override the
plugin version on the command line.

### `WARNING: no real console attached; password input will be visible.`
You ran `BootstrapCognitoAuth` via `mvn exec:java`. Use
`./bootstrap-cognito.sh` instead — it forks a JVM with `java -cp` so
`Console.readPassword()` can hide input.

### `NotAuthorizedException: Refresh Token has expired`
Refresh tokens default to ~30 days. Re-run `./bootstrap-cognito.sh` to mint
and store a new one.
