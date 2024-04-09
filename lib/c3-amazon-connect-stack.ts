import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { CfnContactFlowModule } from 'aws-cdk-lib/aws-connect';
import { Architecture, Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import path = require('path');
import { getBaseDtmfPaymentFlowModuleContent } from './connect/flows';

export class C3AmazonConnectStack extends Stack {
	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props);

		// Validate context variables.
		const amazonConnectInstanceArn = this.node.tryGetContext(
			'amazonConnectInstanceArn',
		);
		if (!amazonConnectInstanceArn) {
			throw new Error('amazonConnectInstanceArn context variable is required.');
		}
		const c3ApiKey = this.node.tryGetContext('c3ApiKey');
		if (!c3ApiKey) {
			throw new Error('c3ApiKey context variable is required.');
		}

		// Create the Lambda functions.
		const commonLambdaProps = {
			architecture: Architecture.ARM_64,
			runtime: Runtime.NODEJS_20_X,
			timeout: Duration.seconds(10),
			handler: 'index.js',
			environment: {
				C3_API_KEY: c3ApiKey,
			},
		};

		const createPaymentRequestFunction = new Function(
			this,
			'c3CreatePaymentRequest',
			{
				...commonLambdaProps,
				description: 'Creates a payment request through the C3 API.',
				code: Code.fromAsset(
					path.join(__dirname, 'lambda/c3-create-payment-request'),
				),
			},
		);

		const reportCustomerActivityFunction = new Function(
			this,
			'c3ReportCustomerActivity',
			{
				...commonLambdaProps,
				description:
					'Reports customer payment activity through C3 to the agent.',
				code: Code.fromAsset(
					path.join(__dirname, 'lambda/c3-report-customer-activity'),
				),
			},
		);

		const tokenizeTransactionFunction = new Function(
			this,
			'c3TokenizeTransaction',
			{
				...commonLambdaProps,
				description:
					'Tokenizes customer payment details and submits to C3 for processing.',
				code: Code.fromAsset(
					path.join(__dirname, 'lambda/c3-tokenize-transaction'),
				),
			},
		);

		// Create the Amazon Connect flows.
		const baseDTMFPaymentFlowModule = new CfnContactFlowModule(
			this,
			'c3BaseDTMFPaymentFlowModule',
			{
				name: 'C3 Base DTMF Payment',
				description: 'Flow module for collecting payments with C3 using DTMF.',
				content: getBaseDtmfPaymentFlowModuleContent(
					createPaymentRequestFunction.functionArn,
					reportCustomerActivityFunction.functionArn,
					tokenizeTransactionFunction.functionArn,
				),
				instanceArn: amazonConnectInstanceArn,
			},
		);
	}
}
