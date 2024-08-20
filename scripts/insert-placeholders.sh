#!/bin/bash

# Replaces all referenced Lambda function ARNs, security key IDs, and certificate content values with placeholder values so
# they can be used in different environments.

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

# Replace the ARN of the C3SendReceipt Lambda function
FUNCTION_NAME="C3SendReceipt"
PLACEHOLDER="<<sendReceiptLambdaArn>>"
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

# Replace the ARN of the C3ValidateEntry Lambda function
FUNCTION_NAME="C3ValidateEntry"
PLACEHOLDER="<<validateEntryLambdaArn>>"
sed -i '' "s|\(\"[^\"]*\": \)\".*${FUNCTION_NAME}.*\"|\1\"$PLACEHOLDER\"|g" "$AGENT_ASSISTED_PAYMENT_IVR_FLOW_FILE"
sed -i '' "s|\(\"[^\"]*\": \)\".*${FUNCTION_NAME}.*\"|\1\"$PLACEHOLDER\"|g" "$PAYMENT_IVR_FLOW_MODULE_FILE"

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


# ---- PROSODY TAG ----

# Replace the prosody tag with placeholders for speaking volume and rate
PROSODY_TAG='<prosody volume=\\"medium\\" rate=\\"medium\\">'
REPLACEMENT='<prosody volume=\\"<<speakingVolume>>\\" rate=\\"<<speakingRate>>\\">'
sed -i '' "s|$PROSODY_TAG|$REPLACEMENT|g" "$AGENT_ASSISTED_PAYMENT_IVR_FLOW_FILE"
sed -i '' "s|$PROSODY_TAG|$REPLACEMENT|g" "$PAYMENT_IVR_FLOW_MODULE_FILE"


# ---- RECEIPT QUEUE ID ----

# Replace the receipt queue ID
QUEUE_ID_PREFIX="34f98ae7-73a8-496b-a1c0-392ae6de130d"
PLACEHOLDER="<<receiptQueueId>>"
sed -i '' "s|$QUEUE_ID_PREFIX|$PLACEHOLDER|g" "$PAYMENT_IVR_FLOW_MODULE_FILE"


# Remove any instances of (Working Copy)
sed -i '' "s| (Working Copy)||g" "$AGENT_ASSISTED_PAYMENT_IVR_FLOW_FILE"
sed -i '' "s| (Working Copy)||g" "$PAYMENT_IVR_FLOW_MODULE_FILE"
sed -i '' "s| (Working Copy)||g" "$SUBJECT_LOOKUP_FLOW_FILE"

echo "✅ Placeholders inserted!"
