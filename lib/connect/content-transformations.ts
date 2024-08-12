import { Function } from 'aws-cdk-lib/aws-lambda';
import * as flowModuleJson from './flows/modules/c3-payment-ivr-flow-module.json';
import * as agentAssistedPaymentIVRFlowJson from './flows/c3-agent-assisted-payment-ivr-flow.json';
import * as subjectLookupFlow from './flows/c3-subject-lookup-flow.json';

/**
 * Gets the content for the payment IVR flow module.
 *
 * @param createPaymentRequestLambdaArn The Lambda function that creates a payment request.
 * @param tokenizeTransactionLambdaArn The Lambda function that tokenizes a transaction.
 * @param submitPaymentLambdaArn The Lambda function that submits a payment.
 * @param amazonConnectSecurityKeyId The security key ID for Amazon Connect.
 * @param amazonConnectSecurityKeyCertificateContent The security key certificate content for Amazon Connect.
 * @param amazonConnectReceiptQueueArn The ARN for the Amazon Connect receipt queue.
 * @returns A string representing the content for the base IVR payment flow module.
 */
export function getPaymentIVRFlowModuleContent(
	createPaymentRequestLambdaFunction: Function,
	tokenizeTransactionLambdaFunction: Function,
	submitPaymentLambdaFunction: Function,
	emailReceiptLambdaFunction: Function,
	amazonConnectSecurityKeyId: string,
	amazonConnectSecurityKeyCertificateContent: string,
	amazonConnectReceiptQueueArn: string,
) {
	let transformedContent = JSON.stringify(flowModuleJson);

	// Don't escape quotes.
	transformedContent = transformedContent.replace(/\\/g, '');

	// Replace Lambda placeholders with actual ARNs.
	transformedContent = transformedContent.replace(
		/<<createPaymentRequestLambdaArn>>/g,
		createPaymentRequestLambdaFunction.functionArn,
	);
	transformedContent = transformedContent.replace(
		/<<tokenizeTransactionLambdaArn>>/g,
		tokenizeTransactionLambdaFunction.functionArn,
	);
	transformedContent = transformedContent.replace(
		/<<submitPaymentLambdaArn>>/g,
		submitPaymentLambdaFunction.functionArn,
	);
	transformedContent = transformedContent.replace(
		/<<emailReceiptLambdaArn>>/g,
		emailReceiptLambdaFunction.functionArn,
	);

	// Replace Amazon Connect security key placeholders with actual values.
	transformedContent = transformedContent.replace(
		/<<amazonConnectSecurityKeyId>>/g,
		amazonConnectSecurityKeyId,
	);
	transformedContent = transformedContent.replace(
		/<<amazonConnectSecurityKeyCertificateContent>>/g,
		amazonConnectSecurityKeyCertificateContent,
	);

	// Replace the receipt queue ID placeholder with the actual value.
	const queueId = amazonConnectReceiptQueueArn.split('/queue/').pop();
	if (!queueId) {
		throw new Error('Invalid ARN for the receipt queue.');
	}
	transformedContent = transformedContent.replace(
		/<<receiptQueueId>>/g,
		queueId,
	);

	return transformedContent;
}

/**
 * Gets the content for the self-service payment IVR flow.
 *
 * @param sendAgentMessageFunction The Lambda function that sends messages to the agent.
 * @param createPaymentRequestFunction The Lambda function that creates a payment request.
 * @param tokenizeTransactionFunction The Lambda function that tokenizes a transaction.
 * @param submitPaymentLambdaFunction The Lambda function that submits a payment.
 * @param amazonConnectSecurityKeyId The security key ID for Amazon Connect.
 * @param amazonConnectSecurityKeyCertificateContent The security key certificate content for Amazon Connect.
 * @returns A string representing the content for the base IVR payment flow.
 */
export function getSelfServicePaymentIVRFlowContent(
	sendAgentMessageFunction: Function,
	createPaymentRequestFunction: Function,
	tokenizeTransactionFunction: Function,
	submitPaymentLambdaFunction: Function,
	emailReceiptLambdaFunction: Function,
	amazonConnectSecurityKeyId: string,
	amazonConnectSecurityKeyCertificateContent: string,
) {
	let transformedContent = JSON.stringify(agentAssistedPaymentIVRFlowJson);

	// Don't escape quotes.
	transformedContent = transformedContent.replace(/\\/g, '');

	// Replace Lambda placeholders with actual ARNs.
	transformedContent = transformedContent.replace(
		/<<sendAgentMessageLambdaArn>>/g,
		sendAgentMessageFunction.functionArn,
	);
	transformedContent = transformedContent.replace(
		/<<createPaymentRequestLambdaArn>>/g,
		createPaymentRequestFunction.functionArn,
	);
	transformedContent = transformedContent.replace(
		/<<tokenizeTransactionLambdaArn>>/g,
		tokenizeTransactionFunction.functionArn,
	);
	transformedContent = transformedContent.replace(
		/<<submitPaymentLambdaArn>>/g,
		submitPaymentLambdaFunction.functionArn,
	);
	transformedContent = transformedContent.replace(
		/<<emailReceiptLambdaArn>>/g,
		emailReceiptLambdaFunction.functionArn,
	);

	// Replace Amazon Connect security key placeholders with actual values.
	transformedContent = transformedContent.replace(
		/<<amazonConnectSecurityKeyId>>/g,
		amazonConnectSecurityKeyId,
	);
	transformedContent = transformedContent.replace(
		/<<amazonConnectSecurityKeyCertificateContent>>/g,
		amazonConnectSecurityKeyCertificateContent,
	);
	return transformedContent;
}

/**
 * Gets the content for the subject lookup flow.
 *
 * @param subjectLookupFunction The Lambda function for getting the details of a subject.
 * @param sendAgentMessageFunction The Lambda function that sends messages to the agent.
 * @returns A string representing the content for the subject lookup flow.
 */
export function getSubjectLookupFlowContent(
	subjectLookupFunction: Function,
	sendAgentMessageFunction: Function,
): string {
	let transformedContent = JSON.stringify(subjectLookupFlow);

	// Don't escape quotes.
	transformedContent = transformedContent.replace(/\\/g, '');

	// Replace the placeholders with the actual values.
	transformedContent = transformedContent.replace(
		/<<subjectLookupLambdaArn>>/g,
		subjectLookupFunction.functionArn,
	);
	transformedContent = transformedContent.replace(
		/<<sendAgentMessageLambdaArn>>/g,
		sendAgentMessageFunction.functionArn,
	);
	return transformedContent;
}
