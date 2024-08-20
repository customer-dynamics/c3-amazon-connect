#!/bin/bash

# Install dependencies
npm ci

# Build the project
npm run build

# Capture the AWS profile argument (if provided)
AWS_PROFILE=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --profile)
      echo "Using AWS profile: $2"
      AWS_PROFILE="--profile $2"
      shift # past argument
      shift # past value
      ;;
    *)
      echo "Unknown argument: $1"
      shift # ignore other arguments
      ;;
  esac
done

# Run the CDK deploy command with the profile (if provided)
cdk deploy $AWS_PROFILE

# Display the URL of the deployed application
npm run display-url
