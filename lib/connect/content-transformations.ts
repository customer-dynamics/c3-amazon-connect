import * as flowModuleJson from './flows/modules/c3-base-dtmf-payment-flow-module.json';

/**
 * Gets the content for the base DTMF payment flow module.
 *
 * @param createPaymentRequestLambdaArn The ARN of the Lambda function that creates a payment request.
 * @param reportCustomerActivityLambdaArn The ARN of the Lambda function that reports customer activity.
 * @param tokenizeTransactionLambdaArn The ARN of the Lambda function that tokenizes a transaction.
 * @param amazonConnectSecurityKeyId The security key ID for Amazon Connect.
 * @param amazonConnectSecurityKeyCertificateContent The security key certificate content for Amazon Connect.
 * @returns A string representing the content for the base DTMF payment flow module.
 */
export function getBaseDtmfPaymentFlowModuleContent(
	createPaymentRequestLambdaArn: string,
	reportCustomerActivityLambdaArn: string,
	tokenizeTransactionLambdaArn: string,
	amazonConnectSecurityKeyId: string,
	amazonConnectSecurityKeyCertificateContent: string,
) {
	let transformedContent = JSON.stringify(flowModuleJson);

	// Don't escape quotes.
	transformedContent = transformedContent.replace('\\', '');

	// Replace Lambda placeholders with actual ARNs.
	transformedContent = transformedContent.replace(
		'<createPaymentRequestLambdaArn>',
		createPaymentRequestLambdaArn,
	);
	transformedContent = transformedContent.replace(
		'<reportCustomerActivityLambdaArn>',
		reportCustomerActivityLambdaArn,
	);
	transformedContent = transformedContent.replace(
		'<tokenizeTransactionLambdaArn>',
		tokenizeTransactionLambdaArn,
	);

	// Replace Amazon Connect security key placeholders with actual values.
	transformedContent = transformedContent.replace(
		'<amazonConnectSecurityKeyId>',
		amazonConnectSecurityKeyId,
	);
	transformedContent = transformedContent.replace(
		'<amazonConnectSecurityKeyCertificateContent>',
		amazonConnectSecurityKeyCertificateContent,
	);

	return transformedContent;
}
