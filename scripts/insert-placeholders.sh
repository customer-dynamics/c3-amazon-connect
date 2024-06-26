#!/bin/bash

AGENT_ASSISTED_PAYMENT_IVR_FLOW_FILE="lib/connect/flows/c3-agent-assisted-payment-ivr-flow.json"
SUBJECT_LOOKUP_FLOW_FILE="lib/connect/flows/c3-subject-lookup-flow.json"
PAYMENT_IVR_FLOW_MODULE_FILE="lib/connect/flows/modules/c3-payment-ivr-flow-module.json"

# ---- LAMBDA FUNCTIONS ----

# Replace the ARN of the C3CreatePaymentRequest Lambda function
FUNCTION_NAME="C3CreatePaymentRequest"
PLACEHOLDER="<<createPaymentRequestLambdaArn>>"
sed -i '' "s|\(\"[^\"]*\": \)\".*${FUNCTION_NAME}.*\"|\1\"$PLACEHOLDER\"|g" "$AGENT_ASSISTED_PAYMENT_IVR_FLOW_FILE"
sed -i '' "s|\(\"[^\"]*\": \)\".*${FUNCTION_NAME}.*\"|\1\"$PLACEHOLDER\"|g" "$PAYMENT_IVR_FLOW_MODULE_FILE"

# Replace the ARN of the C3TokenizeTransaction Lambda function
FUNCTION_NAME="C3TokenizeTransaction"
PLACEHOLDER="<<tokenizeTransactionLambdaArn>>"
sed -i '' "s|\(\"[^\"]*\": \)\".*${FUNCTION_NAME}.*\"|\1\"$PLACEHOLDER\"|g" "$AGENT_ASSISTED_PAYMENT_IVR_FLOW_FILE"
sed -i '' "s|\(\"[^\"]*\": \)\".*${FUNCTION_NAME}.*\"|\1\"$PLACEHOLDER\"|g" "$PAYMENT_IVR_FLOW_MODULE_FILE"

# Replace the ARN of the C3SubmitPayment Lambda function
FUNCTION_NAME="C3SubmitPayment"
PLACEHOLDER="<<submitPaymentLambdaArn>>"
sed -i '' "s|\(\"[^\"]*\": \)\".*${FUNCTION_NAME}.*\"|\1\"$PLACEHOLDER\"|g" "$AGENT_ASSISTED_PAYMENT_IVR_FLOW_FILE"
sed -i '' "s|\(\"[^\"]*\": \)\".*${FUNCTION_NAME}.*\"|\1\"$PLACEHOLDER\"|g" "$PAYMENT_IVR_FLOW_MODULE_FILE"

# Replace the ARN of the C3EmailReceipt Lambda function
FUNCTION_NAME="C3EmailReceipt"
PLACEHOLDER="<<emailReceiptLambdaArn>>"
sed -i '' "s|\(\"[^\"]*\": \)\".*${FUNCTION_NAME}.*\"|\1\"$PLACEHOLDER\"|g" "$AGENT_ASSISTED_PAYMENT_IVR_FLOW_FILE"
sed -i '' "s|\(\"[^\"]*\": \)\".*${FUNCTION_NAME}.*\"|\1\"$PLACEHOLDER\"|g" "$PAYMENT_IVR_FLOW_MODULE_FILE"

# Replace the ARN of the C3SendAgentMessage Lambda function
FUNCTION_NAME="C3SendAgentMessage"
PLACEHOLDER="<<sendAgentMessageLambdaArn>>"
sed -i '' "s|\(\"[^\"]*\": \)\".*${FUNCTION_NAME}.*\"|\1\"$PLACEHOLDER\"|g" "$AGENT_ASSISTED_PAYMENT_IVR_FLOW_FILE"
sed -i '' "s|\(\"[^\"]*\": \)\".*${FUNCTION_NAME}.*\"|\1\"$PLACEHOLDER\"|g" "$SUBJECT_LOOKUP_FLOW_FILE"

# Replace the ARN of the C3SubjectLookup Lambda function
FUNCTION_NAME="C3SubjectLookup"
PLACEHOLDER="<<subjectLookupLambdaArn>>"
sed -i '' "s|\(\"[^\"]*\": \)\".*${FUNCTION_NAME}.*\"|\1\"$PLACEHOLDER\"|g" "$SUBJECT_LOOKUP_FLOW_FILE"

# ---- SECURITY KEY ----

# Replace the security key ID
ENCRYPTION_KEY="EncryptionKeyId"
REPLACEMENT="\"EncryptionKeyId\": \"<<amazonConnectSecurityKeyId>>\""
sed -i '' "s|\".*${ENCRYPTION_KEY}.*\"|$REPLACEMENT|g" "$AGENT_ASSISTED_PAYMENT_IVR_FLOW_FILE"
sed -i '' "s|\".*${ENCRYPTION_KEY}.*\"|$REPLACEMENT|g" "$PAYMENT_IVR_FLOW_MODULE_FILE"


# Replace the certificate content
CERTIFICATE_PREFIX="-----BEGIN CERTIFICATE-----"
PLACEHOLDER="<<amazonConnectSecurityKeyCertificateContent>>"
sed -i '' "s|\(\"[^\"]*\": \)\".*${CERTIFICATE_PREFIX}.*\"|\1\"$PLACEHOLDER\"|g" "$AGENT_ASSISTED_PAYMENT_IVR_FLOW_FILE"
sed -i '' "s|\(\"[^\"]*\": \)\".*${CERTIFICATE_PREFIX}.*\"|\1\"$PLACEHOLDER\"|g" "$PAYMENT_IVR_FLOW_MODULE_FILE"

# Remove any instances of (Working Copy)
sed -i '' "s| (Working Copy)||g" "$AGENT_ASSISTED_PAYMENT_IVR_FLOW_FILE"
sed -i '' "s| (Working Copy)||g" "$PAYMENT_IVR_FLOW_MODULE_FILE"
sed -i '' "s| (Working Copy)||g" "$SUBJECT_LOOKUP_FLOW_FILE"
