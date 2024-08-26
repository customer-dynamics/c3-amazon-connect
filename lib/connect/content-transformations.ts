import { Function } from 'aws-cdk-lib/aws-lambda';
import * as flowModuleJson from './flows/modules/c3-payment-ivr-flow-module.json';
import * as agentAssistedPaymentIVRFlowJson from './flows/c3-agent-assisted-payment-ivr-flow.json';
import * as subjectLookupFlow from './flows/c3-subject-lookup-flow.json';
import * as receiptFlow from './flows/c3-receipt-flow.json';
import { IvrSpeakingContext } from '../models';

/**
 * Gets the content for the payment IVR flow module.
 *
 * @param createPaymentRequestLambdaArn The Lambda function that creates a payment request.
 * @param tokenizeTransactionLambdaArn The Lambda function that tokenizes a transaction.
 * @param submitPaymentLambdaArn The Lambda function that submits a payment.
 * @param sendReceiptLambdaArn The Lambda function that sends a receipt.
 * @param validateEntryLambdaArn The Lambda function that validates the user's entry.
 * @param amazonConnectSecurityKeyId The security key ID for Amazon Connect.
 * @param amazonConnectSecurityKeyCertificateContent The security key certificate content for Amazon Connect.
 * @param amazonConnectReceiptQueueArn The ARN for the Amazon Connect receipt queue.
 * @param ivrSpeakingContext The speaking context for the IVR.
 * @returns A string representing the content for the base IVR payment flow module.
 */
export function getPaymentIVRFlowModuleContent(
	createPaymentRequestLambdaFunction: Function,
	tokenizeTransactionLambdaFunction: Function,
	submitPaymentLambdaFunction: Function,
	sendReceiptLambdaFunction: Function,
	validateEntryLambdaFunction: Function,
	amazonConnectSecurityKeyId: string,
	amazonConnectSecurityKeyCertificateContent: string,
	amazonConnectReceiptQueueArn: string,
	ivrSpeakingContext: IvrSpeakingContext,
) {
	let transformedContent = JSON.stringify(flowModuleJson);

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
		/<<sendReceiptLambdaArn>>/g,
		sendReceiptLambdaFunction.functionArn,
	);
	transformedContent = transformedContent.replace(
		/<<validateEntryLambdaArn>>/g,
		validateEntryLambdaFunction.functionArn,
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
	let queueId = 'NULL';
	if (amazonConnectReceiptQueueArn) {
		queueId = amazonConnectReceiptQueueArn.split('/queue/').pop() ?? 'NULL';
		if (!queueId) {
			throw new Error('Invalid ARN for the receipt queue.');
		}
	}
	transformedContent = transformedContent.replace(
		/<<receiptQueueId>>/g,
		queueId ?? '',
	);

	transformedContent = transformedContent.replace(
		/<<speakingRate>>/g,
		ivrSpeakingContext.rate,
	);
	transformedContent = transformedContent.replace(
		/<<speakingVolume>>/g,
		ivrSpeakingContext.volume,
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
 * @param sendReceiptLambdaFunction The Lambda function that sends a receipt.
 * @param validateEntryLambdaFunction The Lambda function that validates the user's entry.
 * @param amazonConnectSecurityKeyId The security key ID for Amazon Connect.
 * @param amazonConnectSecurityKeyCertificateContent The security key certificate content for Amazon Connect.
 * @param ivrSpeakingContext The speaking context for the IVR.
 * @returns A string representing the content for the base IVR payment flow.
 */
export function getSelfServicePaymentIVRFlowContent(
	sendAgentMessageFunction: Function,
	createPaymentRequestFunction: Function,
	tokenizeTransactionFunction: Function,
	submitPaymentLambdaFunction: Function,
	sendReceiptLambdaFunction: Function,
	validateEntryLambdaFunction: Function,
	amazonConnectSecurityKeyId: string,
	amazonConnectSecurityKeyCertificateContent: string,
	ivrSpeakingContext: IvrSpeakingContext,
) {
	let transformedContent = JSON.stringify(agentAssistedPaymentIVRFlowJson);

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
		/<<sendReceiptLambdaArn>>/g,
		sendReceiptLambdaFunction.functionArn,
	);
	transformedContent = transformedContent.replace(
		/<<validateEntryLambdaArn>>/g,
		validateEntryLambdaFunction.functionArn,
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

	transformedContent = transformedContent.replace(
		/<<speakingRate>>/g,
		ivrSpeakingContext.rate,
	);
	transformedContent = transformedContent.replace(
		/<<speakingVolume>>/g,
		ivrSpeakingContext.volume,
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

/**
 * Gets the content for the receipt flow.
 *
 * @param sendReceiptLambdaArn The Lambda function that sends a receipt.
 * @param sendAgentMessageFunction The Lambda function that sends messages to the agent.
 * @returns A string representing the content for the receipt flow.
 */
export function getReceiptFlowContent(
	sendReceiptLambdaFunction: Function,
	sendAgentMessageFunction: Function,
): string {
	let transformedContent = JSON.stringify(receiptFlow);

	// Replace the placeholders with the actual values.
	transformedContent = transformedContent.replace(
		/<<sendReceiptLambdaArn>>/g,
		sendReceiptLambdaFunction.functionArn,
	);
	transformedContent = transformedContent.replace(
		/<<sendAgentMessageLambdaArn>>/g,
		sendAgentMessageFunction.functionArn,
	);
	return transformedContent;
}
