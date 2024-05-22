import { Function } from 'aws-cdk-lib/aws-lambda';
import * as flowModuleJson from './flows/modules/c3-ivr-payment-flow-module.json';
import * as ivrPaymentFlowJson from './flows/c3-ivr-payment-flow.json';
import * as agentHoldFlowJson from './flows/c3-agent-hold-flow.json';
import { CfnContactFlow } from 'aws-cdk-lib/aws-connect';

/**
 * Gets the content for the IVR payment flow module.
 *
 * @param createPaymentRequestLambdaArn The Lambda function that creates a payment request.
 * @param tokenizeTransactionLambdaArn The Lambda function that tokenizes a transaction.
 * @param submitPaymentLambdaArn The Lambda function that submits a payment.
 * @param amazonConnectSecurityKeyId The security key ID for Amazon Connect.
 * @param amazonConnectSecurityKeyCertificateContent The security key certificate content for Amazon Connect.
 * @returns A string representing the content for the base IVR payment flow module.
 */
export function getIVRPaymentFlowModuleContent(
	createPaymentRequestLambdaFunction: Function,
	tokenizeTransactionLambdaFunction: Function,
	submitPaymentLambdaFunction: Function,
	emailReceiptLambdaFunction: Function,
	amazonConnectSecurityKeyId: string,
	amazonConnectSecurityKeyCertificateContent: string,
) {
	let transformedContent = JSON.stringify(flowModuleJson);

	// Don't escape quotes.
	transformedContent = transformedContent.replace('\\', '');

	// Replace Lambda placeholders with actual ARNs.
	transformedContent = transformedContent.replace(
		/<createPaymentRequestLambdaArn>/g,
		createPaymentRequestLambdaFunction.functionArn,
	);
	transformedContent = transformedContent.replace(
		/<tokenizeTransactionLambdaArn>/g,
		tokenizeTransactionLambdaFunction.functionArn,
	);
	transformedContent = transformedContent.replace(
		/<submitPaymentLambdaArn>/g,
		submitPaymentLambdaFunction.functionArn,
	);
	transformedContent = transformedContent.replace(
		/<emailReceiptLambdaArn>/g,
		emailReceiptLambdaFunction.functionArn,
	);

	// Replace Amazon Connect security key placeholders with actual values.
	transformedContent = transformedContent.replace(
		/<amazonConnectSecurityKeyId>/g,
		amazonConnectSecurityKeyId,
	);
	transformedContent = transformedContent.replace(
		/<amazonConnectSecurityKeyCertificateContent>/g,
		amazonConnectSecurityKeyCertificateContent,
	);
	return transformedContent;
}

/**
 * Gets the content for the IVR payment flow.
 *
 * @param agentHoldFlow The agent hold flow.
 * @param reportCustomerActivityLambdaArn The Lambda function that reports customer activity.
 * @param createPaymentRequestLambdaArn The Lambda function that creates a payment request.
 * @param tokenizeTransactionLambdaArn The Lambda function that tokenizes a transaction.
 * @param submitPaymentLambdaArn The Lambda function that submits a payment.
 * @param amazonConnectSecurityKeyId The security key ID for Amazon Connect.
 * @param amazonConnectSecurityKeyCertificateContent The security key certificate content for Amazon Connect.
 * @returns A string representing the content for the base IVR payment flow.
 */
export function getIVRPaymentFlowContent(
	agentHoldFlow: CfnContactFlow,
	reportCustomerActivityLambdaFunction: Function,
	createPaymentRequestLambdaFunction: Function,
	tokenizeTransactionLambdaFunction: Function,
	submitPaymentLambdaFunction: Function,
	emailReceiptLambdaFunction: Function,
	amazonConnectSecurityKeyId: string,
	amazonConnectSecurityKeyCertificateContent: string,
) {
	let transformedContent = JSON.stringify(ivrPaymentFlowJson);

	// Don't escape quotes.
	transformedContent = transformedContent.replace('\\', '');

	// Replace agent hold flow placeholder with actual ARN.
	transformedContent = transformedContent.replace(
		/<agentHoldFlowArn>/g,
		agentHoldFlow.ref,
	);

	// Replace Lambda placeholders with actual ARNs.
	transformedContent = transformedContent.replace(
		/<reportCustomerActivityLambdaArn>/g,
		reportCustomerActivityLambdaFunction.functionArn,
	);
	transformedContent = transformedContent.replace(
		/<createPaymentRequestLambdaArn>/g,
		createPaymentRequestLambdaFunction.functionArn,
	);
	transformedContent = transformedContent.replace(
		/<tokenizeTransactionLambdaArn>/g,
		tokenizeTransactionLambdaFunction.functionArn,
	);
	transformedContent = transformedContent.replace(
		/<submitPaymentLambdaArn>/g,
		submitPaymentLambdaFunction.functionArn,
	);
	transformedContent = transformedContent.replace(
		/<emailReceiptLambdaArn>/g,
		emailReceiptLambdaFunction.functionArn,
	);

	// Replace Amazon Connect security key placeholders with actual values.
	transformedContent = transformedContent.replace(
		/<amazonConnectSecurityKeyId>/g,
		amazonConnectSecurityKeyId,
	);
	transformedContent = transformedContent.replace(
		/<amazonConnectSecurityKeyCertificateContent>/g,
		amazonConnectSecurityKeyCertificateContent,
	);
	return transformedContent;
}

/**
 * Gets the content for the agent hold flow.
 *
 * @returns A string representing the content for the agent hold flow.
 */
export function getAgentHoldFlowContent() {
	let transformedContent = JSON.stringify(agentHoldFlowJson);

	// Don't escape quotes.
	transformedContent = transformedContent.replace('\\', '');
	return transformedContent;
}
