#!/usr/bin/env bash
# Run BootstrapCognitoAuth with a real controlling terminal so that
# Console.readPassword() can hide input. mvn exec:java captures stdout
# and would fall back to visible-input mode.
#
# Usage: ./bootstrap-cognito.sh <COGNITO_CLIENT_ID> [REGION]
#   or:  COGNITO_CLIENT_ID=... AWS_REGION=... ./bootstrap-cognito.sh

set -euo pipefail

cd "$(dirname "$0")"

# Compile project + tests so target/classes and target/test-classes are populated.
mvn -q test-compile

# Build the runtime classpath (test scope) once into a file.
CP_FILE="target/.exec-test-classpath"
mvn -q dependency:build-classpath \
  -DincludeScope=test \
  -Dmdep.outputFile="${CP_FILE}" \
  -Dmdep.pathSeparator=":"

CP="target/test-classes:target/classes:$(cat "${CP_FILE}")"

# Forward any args (client id, region) and inherit the terminal.
exec java -cp "${CP}" dev.jettro.BootstrapCognitoAuth "$@"
