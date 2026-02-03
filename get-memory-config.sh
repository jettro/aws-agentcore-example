#!/bin/bash

# Script to fetch AgentCore Memory configuration from CloudFormation
# Usage: ./get-memory-config.sh [stack-name] [output-format] [aws-profile]
# 
# Arguments:
#   stack-name: Name of the CloudFormation stack (default: nested AgentCore stack)
#   output-format: 'env' for environment variables, 'properties' for Java properties (default: both)
#   aws-profile: AWS profile to use (default: personal)

# Note: Use the nested AgentCore stack name, not the main stack
# The nested stack contains the actual outputs (MemoryId, MemoryArn, etc.)
STACK_NAME="${1:-BedrockAgentCoreStack833DC700}"
OUTPUT_FORMAT="${2:-both}"
AWS_PROFILE="${3:-personal}"

echo "Fetching AgentCore Memory configuration from CloudFormation stack: $STACK_NAME"
echo "Using AWS profile: $AWS_PROFILE"
echo "============================================================================"
echo

# Fetch stack outputs
OUTPUTS=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --profile "$AWS_PROFILE" \
  --query 'Stacks[0].Outputs' \
  --output json 2>/dev/null)

if [ $? -ne 0 ]; then
  echo "Error: Failed to fetch stack outputs. Make sure:"
  echo "  1. The stack '$STACK_NAME' exists"
  echo "  2. You have AWS credentials configured"
  echo "  3. You have permission to describe CloudFormation stacks"
  exit 1
fi

# Extract values
MEMORY_ID=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="MemoryId") | .OutputValue')
MEMORY_ARN=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="MemoryArn") | .OutputValue')
SUMMARIZATION_ID=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="SummarizationStrategyId") | .OutputValue')
SEMANTIC_ID=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="SemanticStrategyId") | .OutputValue')
USER_PREFERENCE_ID=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="UserPreferenceStrategyId") | .OutputValue')

# Check if IDs were found
if [ -z "$MEMORY_ID" ] || [ "$MEMORY_ID" == "null" ]; then
  echo "Error: MemoryId not found in stack outputs."
  echo "Have you deployed the updated CDK stack?"
  exit 1
fi

# Display in requested format
if [ "$OUTPUT_FORMAT" == "env" ] || [ "$OUTPUT_FORMAT" == "both" ]; then
  echo "Environment Variables (export these to use in your shell):"
  echo "==========================================================="
  echo "export AGENTCORE_MEMORY_ID=\"$MEMORY_ID\""
  [ -n "$SUMMARIZATION_ID" ] && [ "$SUMMARIZATION_ID" != "null" ] && \
    echo "export AGENTCORE_SUMMARIZATION_STRATEGY_ID=\"$SUMMARIZATION_ID\""
  [ -n "$SEMANTIC_ID" ] && [ "$SEMANTIC_ID" != "null" ] && \
    echo "export AGENTCORE_SEMANTIC_STRATEGY_ID=\"$SEMANTIC_ID\""
  [ -n "$USER_PREFERENCE_ID" ] && [ "$USER_PREFERENCE_ID" != "null" ] && \
    echo "export AGENTCORE_USER_PREFERENCE_STRATEGY_ID=\"$USER_PREFERENCE_ID\""
  echo
fi

if [ "$OUTPUT_FORMAT" == "properties" ] || [ "$OUTPUT_FORMAT" == "both" ]; then
  echo "Java Properties (add these to application.properties):"
  echo "======================================================="
  echo "agentcore.memory.id=$MEMORY_ID"
  [ -n "$SUMMARIZATION_ID" ] && [ "$SUMMARIZATION_ID" != "null" ] && \
    echo "agentcore.memory.strategy.summarization=$SUMMARIZATION_ID"
  [ -n "$SEMANTIC_ID" ] && [ "$SEMANTIC_ID" != "null" ] && \
    echo "agentcore.memory.strategy.semantic=$SEMANTIC_ID"
  [ -n "$USER_PREFERENCE_ID" ] && [ "$USER_PREFERENCE_ID" != "null" ] && \
    echo "agentcore.memory.strategy.userpreference=$USER_PREFERENCE_ID"
  echo
fi

echo "Memory ARN: $MEMORY_ARN"
echo
echo "To use these in your current shell session, run:"
echo "  source <(./get-memory-config.sh $STACK_NAME env $AWS_PROFILE)"
