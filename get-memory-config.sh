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
OUTPUT_FORMAT="${2:-env}"
AWS_PROFILE="${3:-personal}"

echo "Fetching AgentCore Memory configuration from CloudFormation stack: $STACK_NAME" >&2
echo "Using AWS profile: $AWS_PROFILE" >&2
echo "============================================================================" >&2
echo >&2

# Fetch stack outputs
OUTPUTS=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --profile "$AWS_PROFILE" \
  --query 'Stacks[0].Outputs' \
  --output json 2>/dev/null)

if [ $? -ne 0 ]; then
  echo "Error: Failed to fetch stack outputs. Make sure:" >&2
  echo "  1. The stack '$STACK_NAME' exists" >&2
  echo "  2. You have AWS credentials configured" >&2
  echo "  3. You have permission to describe CloudFormation stacks" >&2
  exit 1
fi

echo "-- $OUTPUTS --"

# Extract Memory ID and ARN from CloudFormation outputs
MEMORY_ID=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="MemoryId") | .OutputValue')
MEMORY_ARN=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="MemoryArn") | .OutputValue')

# Fetch strategy IDs directly from the Memory API (since CloudFormation cannot export them)
echo "Fetching strategy IDs from Memory API..." >&2
MEMORY_RESPONSE=$(aws bedrock-agentcore-control get-memory \
  --memory-id "$MEMORY_ID" \
  --profile "$AWS_PROFILE" \
  --output json 2>/dev/null)

if [ $? -ne 0 ]; then
  echo "Warning: Failed to fetch memory details. Strategy IDs will not be available." >&2
  SUMMARIZATION_ID=""
  SEMANTIC_ID=""
  USER_PREFERENCE_ID=""
else
  # Extract strategy IDs by type from the memory response
  SUMMARIZATION_ID=$(echo "$MEMORY_RESPONSE" | jq -r '.memory.strategies[] | select(.type=="SUMMARIZATION") | .strategyId')
  SEMANTIC_ID=$(echo "$MEMORY_RESPONSE" | jq -r '.memory.strategies[] | select(.type=="SEMANTIC") | .strategyId')
  USER_PREFERENCE_ID=$(echo "$MEMORY_RESPONSE" | jq -r '.memory.strategies[] | select(.type=="USER_PREFERENCE") | .strategyId')
fi

# Check if IDs were found
if [ -z "$MEMORY_ID" ] || [ "$MEMORY_ID" = "null" ]; then
  echo "Error: MemoryId not found in stack outputs." >&2
  echo "Have you deployed the updated CDK stack?" >&2
  exit 1
fi

# Export variables directly
if [ "$OUTPUT_FORMAT" = "env" ] || [ "$OUTPUT_FORMAT" = "both" ]; then
  echo "About to export environment variables"
  
  export AGENTCORE_MEMORY_ID="$MEMORY_ID"
  [ -n "$SUMMARIZATION_ID" ] && [ "$SUMMARIZATION_ID" != "null" ] && \
    export AGENTCORE_SUMMARIZATION_STRATEGY_ID="$SUMMARIZATION_ID"
  [ -n "$SEMANTIC_ID" ] && [ "$SEMANTIC_ID" != "null" ] && \
    export AGENTCORE_SEMANTIC_STRATEGY_ID="$SEMANTIC_ID"
  [ -n "$USER_PREFERENCE_ID" ] && [ "$USER_PREFERENCE_ID" != "null" ] && \
    export AGENTCORE_USER_PREFERENCE_STRATEGY_ID="$USER_PREFERENCE_ID"
  
  # CDK Deployment Variables
  [ -n "$SUMMARIZATION_ID" ] && [ "$SUMMARIZATION_ID" != "null" ] && \
    export SUMMARIZATION_STRATEGY_ID="$SUMMARIZATION_ID"
  [ -n "$SEMANTIC_ID" ] && [ "$SEMANTIC_ID" != "null" ] && \
    export SEMANTIC_STRATEGY_ID="$SEMANTIC_ID"
  [ -n "$USER_PREFERENCE_ID" ] && [ "$USER_PREFERENCE_ID" != "null" ] && \
    export USER_PREFERENCE_STRATEGY_ID="$USER_PREFERENCE_ID"
  
  echo "Exported environment variables:" >&2
  echo "  AGENTCORE_MEMORY_ID=$AGENTCORE_MEMORY_ID" >&2
  [ -n "$AGENTCORE_SUMMARIZATION_STRATEGY_ID" ] && echo "  AGENTCORE_SUMMARIZATION_STRATEGY_ID=$AGENTCORE_SUMMARIZATION_STRATEGY_ID" >&2
  [ -n "$AGENTCORE_SEMANTIC_STRATEGY_ID" ] && echo "  AGENTCORE_SEMANTIC_STRATEGY_ID=$AGENTCORE_SEMANTIC_STRATEGY_ID" >&2
  [ -n "$AGENTCORE_USER_PREFERENCE_STRATEGY_ID" ] && echo "  AGENTCORE_USER_PREFERENCE_STRATEGY_ID=$AGENTCORE_USER_PREFERENCE_STRATEGY_ID" >&2
fi

if [ "$OUTPUT_FORMAT" = "properties" ] || [ "$OUTPUT_FORMAT" = "both" ]; then
  echo "Java Properties (add these to application.properties):" >&2
  echo "=======================================================" >&2
  echo "agentcore.memory.id=$MEMORY_ID" >&2
  [ -n "$SUMMARIZATION_ID" ] && [ "$SUMMARIZATION_ID" != "null" ] && \
    echo "agentcore.memory.strategy.summarization=$SUMMARIZATION_ID" >&2
  [ -n "$SEMANTIC_ID" ] && [ "$SEMANTIC_ID" != "null" ] && \
    echo "agentcore.memory.strategy.semantic=$SEMANTIC_ID" >&2
  [ -n "$USER_PREFERENCE_ID" ] && [ "$USER_PREFERENCE_ID" != "null" ] && \
    echo "agentcore.memory.strategy.userpreference=$USER_PREFERENCE_ID" >&2
  echo >&2
fi

echo "Memory ARN: $MEMORY_ARN" >&2
echo >&2
echo "Usage: source ./get-memory-config.sh [stack-name] [output-format] [aws-profile]" >&2
