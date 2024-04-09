/**
 * Gets the content for the base DTMF payment flow module.
 *
 * @param createPaymentRequestLambdaArn The ARN of the Lambda function that creates a payment request.
 * @param reportCustomerActivityLambdaArn The ARN of the Lambda function that reports customer activity.
 * @param tokenizeTransactionLambdaArn The ARN of the Lambda function that tokenizes a transaction.
 * @returns A JSON string representing the content for the base DTMF payment flow module.
 */
export function getBaseDtmfPaymentFlowModuleContent(
	createPaymentRequestLambdaArn: string,
	reportCustomerActivityLambdaArn: string,
	tokenizeTransactionLambdaArn: string,
) {
	const contentJson = {
		Version: '2019-10-30',
		StartAction: 'Create Payment Request',
		Metadata: {
			entryPointPosition: { x: 40, y: 40 },
			ActionMetadata: {
				'Complete Payment': {
					position: { x: 1910.4, y: 19.2 },
					isFriendlyName: true,
					dynamicMetadata: {},
				},
				'Get Security Code': {
					position: { x: 1469.6, y: 20 },
					isFriendlyName: true,
					conditionMetadata: [],
					countryCodePrefix: '+1',
				},
				'Report Security Code Entered': {
					position: { x: 1696.8, y: 20 },
					isFriendlyName: true,
					dynamicMetadata: {},
				},
				'Payment Success': {
					position: { x: 2153.6, y: 21.6 },
					isFriendlyName: true,
				},
				'fe955f82-d4e7-400e-843d-d28dfa98d42a': {
					position: { x: 2455.2, y: 22.4 },
				},
				'3752e184-d8ec-429c-97fe-cd5ed81a74fa': {
					position: { x: 587.2, y: 628.8 },
				},
				'Get & Encrypt Card Number': {
					position: { x: 586.4, y: 23.2 },
					isFriendlyName: true,
					conditionMetadata: [],
					countryCodePrefix: '+1',
				},
				'Report Expiration Entered': {
					position: { x: 1252, y: 21.6 },
					isFriendlyName: true,
					dynamicMetadata: {},
				},
				'Report Card Entered': {
					position: { x: 814.4, y: 24.8 },
					isFriendlyName: true,
					dynamicMetadata: {},
				},
				'Get Expiration Date': {
					position: { x: 1032.8, y: 24 },
					isFriendlyName: true,
					conditionMetadata: [],
					countryCodePrefix: '+1',
				},
				'Internal Error': {
					position: { x: 357.6, y: 248 },
					isFriendlyName: true,
				},
				'Record Payment Request': {
					position: { x: 364, y: 19.2 },
					isFriendlyName: true,
					dynamicParams: [],
				},
				'Create Payment Request': {
					position: { x: 144, y: 20 },
					isFriendlyName: true,
					parameters: {
						LambdaFunctionARN: { displayName: 'c3CreatePaymentRequest' },
					},
				},
			},
			Annotations: [
				{
					type: 'default',
					id: 'c14ec548-e73b-45ef-810a-f1f24a40589a',
					content: "An error here shouldn't stop the payment flow.",
					actionId: 'Report Card Entered',
					isFolded: true,
					position: { x: 1037.1666666666667, y: 237.66666666666666 },
					size: { height: 295, width: 300 },
				},
				{
					type: 'default',
					id: '830dd1c1-53ce-4f52-8c0a-4f93a4f7ea5f',
					content: "An error here shouldn't stop the payment flow.",
					actionId: 'Report Expiration Entered',
					isFolded: true,
					position: { x: 1584.1666666666667, y: 233.66666666666666 },
					size: { height: 295, width: 300 },
				},
				{
					type: 'default',
					id: '6e6f1811-0d99-4259-b6eb-69b204e1cb77',
					content: "An error here shouldn't stop the payment flow.",
					actionId: 'Report Security Code Entered',
					isFolded: true,
					position: { x: 2140.1666666666665, y: 231.66666666666666 },
					size: { height: 295, width: 300 },
				},
			],
			name: 'Base DTMF Payment',
			description: '',
			status: 'saved',
			hash: {},
		},
		Actions: [
			{
				Parameters: {
					InvocationTimeLimitSeconds: '3',
					ResponseValidation: { ResponseType: 'STRING_MAP' },
				},
				Identifier: 'Complete Payment',
				Type: 'InvokeLambdaFunction',
				Transitions: {
					NextAction: 'Payment Success',
					Errors: [{ NextAction: '', ErrorType: 'NoMatchingError' }],
				},
			},
			{
				Parameters: {
					StoreInput: 'True',
					InputTimeLimitSeconds: '5',
					DTMFConfiguration: { DisableCancelKey: 'False' },
					InputValidation: { CustomValidation: { MaximumLength: '20' } },
				},
				Identifier: 'Get Security Code',
				Type: 'GetParticipantInput',
				Transitions: {
					NextAction: 'Report Security Code Entered',
					Errors: [{ NextAction: '', ErrorType: 'NoMatchingError' }],
				},
			},
			{
				Parameters: {
					InvocationTimeLimitSeconds: '3',
					ResponseValidation: { ResponseType: 'STRING_MAP' },
				},
				Identifier: 'Report Security Code Entered',
				Type: 'InvokeLambdaFunction',
				Transitions: {
					NextAction: 'Complete Payment',
					Errors: [
						{ NextAction: 'Complete Payment', ErrorType: 'NoMatchingError' },
					],
				},
			},
			{
				Parameters: { Text: 'Your payment was processed successfully.' },
				Identifier: 'Payment Success',
				Type: 'MessageParticipant',
				Transitions: {
					NextAction: 'fe955f82-d4e7-400e-843d-d28dfa98d42a',
					Errors: [{ NextAction: '', ErrorType: 'NoMatchingError' }],
				},
			},
			{
				Parameters: {},
				Identifier: 'fe955f82-d4e7-400e-843d-d28dfa98d42a',
				Type: 'EndFlowModuleExecution',
				Transitions: {},
			},
			{
				Parameters: {},
				Identifier: '3752e184-d8ec-429c-97fe-cd5ed81a74fa',
				Type: 'EndFlowModuleExecution',
				Transitions: {},
			},
			{
				Parameters: {
					StoreInput: 'True',
					InputTimeLimitSeconds: '5',
					Text: 'Please enter your card number. Press the pound key when complete.',
					DTMFConfiguration: {
						DisableCancelKey: 'False',
						InputTerminationSequence: '#',
					},
					InputValidation: { CustomValidation: { MaximumLength: '20' } },
				},
				Identifier: 'Get & Encrypt Card Number',
				Type: 'GetParticipantInput',
				Transitions: {
					NextAction: 'Report Card Entered',
					Errors: [{ NextAction: '', ErrorType: 'NoMatchingError' }],
				},
			},
			{
				Parameters: {
					InvocationTimeLimitSeconds: '3',
					ResponseValidation: { ResponseType: 'STRING_MAP' },
				},
				Identifier: 'Report Expiration Entered',
				Type: 'InvokeLambdaFunction',
				Transitions: {
					NextAction: 'Get Security Code',
					Errors: [
						{ NextAction: 'Get Security Code', ErrorType: 'NoMatchingError' },
					],
				},
			},
			{
				Parameters: {
					InvocationTimeLimitSeconds: '3',
					ResponseValidation: { ResponseType: 'STRING_MAP' },
				},
				Identifier: 'Report Card Entered',
				Type: 'InvokeLambdaFunction',
				Transitions: {
					NextAction: 'Get Expiration Date',
					Errors: [
						{ NextAction: 'Get Expiration Date', ErrorType: 'NoMatchingError' },
					],
				},
			},
			{
				Parameters: {
					StoreInput: 'True',
					InputTimeLimitSeconds: '5',
					Text: "Please enter your card's expiration date, followed by the pound key.",
					DTMFConfiguration: {
						DisableCancelKey: 'False',
						InputTerminationSequence: '#',
					},
					InputValidation: { CustomValidation: { MaximumLength: '20' } },
				},
				Identifier: 'Get Expiration Date',
				Type: 'GetParticipantInput',
				Transitions: {
					NextAction: 'Report Expiration Entered',
					Errors: [{ NextAction: '', ErrorType: 'NoMatchingError' }],
				},
			},
			{
				Parameters: {
					Text: "We're sorry, an error has occured that prevents us from collecting the payment. Please report this to your customer service representative and try again later.",
				},
				Identifier: 'Internal Error',
				Type: 'MessageParticipant',
				Transitions: {
					NextAction: '3752e184-d8ec-429c-97fe-cd5ed81a74fa',
					Errors: [
						{
							NextAction: '3752e184-d8ec-429c-97fe-cd5ed81a74fa',
							ErrorType: 'NoMatchingError',
						},
					],
				},
			},
			{
				Parameters: { Attributes: {}, TargetContact: 'Current' },
				Identifier: 'Record Payment Request',
				Type: 'UpdateContactAttributes',
				Transitions: {
					NextAction: 'Get & Encrypt Card Number',
					Errors: [
						{ NextAction: 'Internal Error', ErrorType: 'NoMatchingError' },
					],
				},
			},
			{
				Parameters: {
					LambdaFunctionARN: createPaymentRequestLambdaArn,
					InvocationTimeLimitSeconds: '3',
					LambdaInvocationAttributes: {},
					ResponseValidation: { ResponseType: 'JSON' },
				},
				Identifier: 'Create Payment Request',
				Type: 'InvokeLambdaFunction',
				Transitions: {
					NextAction: 'Record Payment Request',
					Errors: [
						{ NextAction: 'Internal Error', ErrorType: 'NoMatchingError' },
					],
				},
			},
		],
		Settings: {
			InputParameters: [],
			OutputParameters: [],
			Transitions: [
				{ DisplayName: 'Success', ReferenceName: 'Success', Description: '' },
				{ DisplayName: 'Error', ReferenceName: 'Error', Description: '' },
			],
		},
	};
	return `${contentJson}`;
}
