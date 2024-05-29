#!/bin/bash

IVR_PAYMENT_FLOW_FILE="lib/connect/flows/c3-ivr-payment-flow.json"
IVR_PAYMENT_FLOW_MODULE_FILE="lib/connect/flows/modules/c3-ivr-payment-flow-module.json"
AGENT_HOLD_FLOW_FILE="lib/connect/flows/c3-agent-hold-flow.json"

# ---- LAMBDA FUNCTIONS ----

# Replace the ARN of the C3CreatePaymentRequest Lambda function
FUNCTION_NAME="C3CreatePaymentRequest"
PLACEHOLDER="<<createPaymentRequestLambdaArn>>"
sed -i '' "s|\(\"[^\"]*\": \)\".*${FUNCTION_NAME}.*\"|\1\"$PLACEHOLDER\"|g" "$IVR_PAYMENT_FLOW_FILE"
sed -i '' "s|\(\"[^\"]*\": \)\".*${FUNCTION_NAME}.*\"|\1\"$PLACEHOLDER\"|g" "$IVR_PAYMENT_FLOW_MODULE_FILE"

# Replace the ARN of the C3TokenizeTransaction Lambda function
FUNCTION_NAME="C3TokenizeTransaction"
PLACEHOLDER="<<tokenizeTransactionLambdaArn>>"
sed -i '' "s|\(\"[^\"]*\": \)\".*${FUNCTION_NAME}.*\"|\1\"$PLACEHOLDER\"|g" "$IVR_PAYMENT_FLOW_FILE"
sed -i '' "s|\(\"[^\"]*\": \)\".*${FUNCTION_NAME}.*\"|\1\"$PLACEHOLDER\"|g" "$IVR_PAYMENT_FLOW_MODULE_FILE"

# Replace the ARN of the C3SubmitPayment Lambda function
FUNCTION_NAME="C3SubmitPayment"
PLACEHOLDER="<<submitPaymentLambdaArn>>"
sed -i '' "s|\(\"[^\"]*\": \)\".*${FUNCTION_NAME}.*\"|\1\"$PLACEHOLDER\"|g" "$IVR_PAYMENT_FLOW_FILE"
sed -i '' "s|\(\"[^\"]*\": \)\".*${FUNCTION_NAME}.*\"|\1\"$PLACEHOLDER\"|g" "$IVR_PAYMENT_FLOW_MODULE_FILE"

# Replace the ARN of the C3EmailReceipt Lambda function
FUNCTION_NAME="C3EmailReceipt"
PLACEHOLDER="<<emailReceiptLambdaArn>>"
sed -i '' "s|\(\"[^\"]*\": \)\".*${FUNCTION_NAME}.*\"|\1\"$PLACEHOLDER\"|g" "$IVR_PAYMENT_FLOW_FILE"
sed -i '' "s|\(\"[^\"]*\": \)\".*${FUNCTION_NAME}.*\"|\1\"$PLACEHOLDER\"|g" "$IVR_PAYMENT_FLOW_MODULE_FILE"

# Replace the ARN of the C3ReportCustomerActivity Lambda function
FUNCTION_NAME="C3ReportCustomerActivity"
PLACEHOLDER="<<reportCustomerActivityLambdaArn>>"
sed -i '' "s|\(\"[^\"]*\": \)\".*${FUNCTION_NAME}.*\"|\1\"$PLACEHOLDER\"|g" "$IVR_PAYMENT_FLOW_FILE"


# ---- FLOWS ----

# Replace the ARN of the agent hold flow
FLOW_PATH="/contact-flow/"
PLACEHOLDER="<<agentHoldFlowArn>>"
sed -i '' "s|\(\"[^\"]*\": \)\".*${FLOW_PATH}.*\"|\1\"$PLACEHOLDER\"|g" "$IVR_PAYMENT_FLOW_FILE"


# ---- SECURITY KEY ----

# Replace the security key ID
ENCRYPTION_KEY="EncryptionKeyId"
REPLACEMENT="\"EncryptionKeyId\": \"<<amazonConnectSecurityKeyId>>\""
sed -i '' "s|\".*${ENCRYPTION_KEY}.*\"|$REPLACEMENT|g" "$IVR_PAYMENT_FLOW_FILE"
sed -i '' "s|\".*${ENCRYPTION_KEY}.*\"|$REPLACEMENT|g" "$IVR_PAYMENT_FLOW_MODULE_FILE"


# Replace the certificate content
CERTIFICATE_PREFIX="-----BEGIN CERTIFICATE-----"
PLACEHOLDER="<<amazonConnectSecurityKeyCertificateContent>>"
sed -i '' "s|\(\"[^\"]*\": \)\".*${CERTIFICATE_PREFIX}.*\"|\1\"$PLACEHOLDER\"|g" "$IVR_PAYMENT_FLOW_FILE"
sed -i '' "s|\(\"[^\"]*\": \)\".*${CERTIFICATE_PREFIX}.*\"|\1\"$PLACEHOLDER\"|g" "$IVR_PAYMENT_FLOW_MODULE_FILE"

# Remove any instances of (Working Copy)
sed -i '' "s| (Working Copy)||g" "$IVR_PAYMENT_FLOW_FILE"
sed -i '' "s| (Working Copy)||g" "$IVR_PAYMENT_FLOW_MODULE_FILE"
sed -i '' "s| (Working Copy)||g" "$AGENT_HOLD_FLOW_FILE"
