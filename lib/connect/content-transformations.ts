import { Function } from 'aws-cdk-lib/aws-lambda';
import * as flowModuleJson from './flows/modules/c3-dtmf-payment-flow-module.json';

/**
 * Gets the content for the DTMF payment flow module.
 *
 * @param createPaymentRequestLambdaArn The ARN of the Lambda function that creates a payment request.
 * @param tokenizeTransactionLambdaArn The ARN of the Lambda function that tokenizes a transaction.
 * @param submitPaymentLambdaArn The ARN of the Lambda function that submits a payment.
 * @param amazonConnectSecurityKeyId The security key ID for Amazon Connect.
 * @param amazonConnectSecurityKeyCertificateContent The security key certificate content for Amazon Connect.
 * @returns A string representing the content for the base DTMF payment flow module.
 */
export function getDtmfPaymentFlowModuleContent(
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
