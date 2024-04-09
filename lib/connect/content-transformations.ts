import * as flowModuleJson from './flows/modules/c3-base-dtmf-payment-flow-module.json';

/**
 * Gets the content for the base DTMF payment flow module.
 *
 * @param createPaymentRequestLambdaArn The ARN of the Lambda function that creates a payment request.
 * @param reportCustomerActivityLambdaArn The ARN of the Lambda function that reports customer activity.
 * @param tokenizeTransactionLambdaArn The ARN of the Lambda function that tokenizes a transaction.
 * @returns A string representing the content for the base DTMF payment flow module.
 */
export function getBaseDtmfPaymentFlowModuleContent(
	createPaymentRequestLambdaArn: string,
	reportCustomerActivityLambdaArn: string,
	tokenizeTransactionLambdaArn: string,
) {
	let transformedContent = JSON.stringify(flowModuleJson);

	// Don't escape quotes.
	transformedContent = transformedContent.replace('\\', '');

	// Replace placeholders with actual ARNs.
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

	return transformedContent;
}
