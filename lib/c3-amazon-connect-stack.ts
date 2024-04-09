import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import {
	CfnContactFlowModule,
	CfnIntegrationAssociation,
} from 'aws-cdk-lib/aws-connect';
import { Architecture, Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import path = require('path');

import { getBaseDtmfPaymentFlowModuleContent } from './connect/content-transformations.js';

export class C3AmazonConnectStack extends Stack {
	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props);

		// Validate context variables.
		console.log('Validating context variables...');
		const amazonConnectInstanceArn = this.node.tryGetContext(
			'amazonConnectInstanceArn',
		);
		if (!amazonConnectInstanceArn) {
			throw new Error('amazonConnectInstanceArn context variable is required.');
		}
		const amazonConnectSecurityKeyId = this.node.tryGetContext(
			'amazonConnectSecurityKeyId',
		);
		if (!amazonConnectSecurityKeyId) {
			throw new Error(
				'amazonConnectSecurityKeyId context variable is required.',
			);
		}
		const amazonConnectSecurityKeyCertificateContent = this.node.tryGetContext(
			'amazonConnectSecurityKeyCertificateContent',
		);
		if (!amazonConnectSecurityKeyCertificateContent) {
			throw new Error(
				'amazonConnectSecurityKeyCertificateContent context variable is required.',
			);
		}
		const c3Env = this.node.tryGetContext('c3Env');
		if (!c3Env) {
			throw new Error('c3Env context variable is required.');
		}
		const c3ApiKey = this.node.tryGetContext('c3ApiKey');
		if (!c3ApiKey) {
			throw new Error('c3ApiKey context variable is required.');
		}
		const c3VendorId = this.node.tryGetContext('c3VendorId');
		if (!c3VendorId) {
			throw new Error('c3VendorId context variable is required.');
		}
		const logoUrl = this.node.tryGetContext('logoUrl');
		if (!logoUrl) {
			throw new Error('logoUrl context variable is required.');
		}
		const supportPhone = this.node.tryGetContext('supportPhone');
		if (!supportPhone) {
			throw new Error('supportPhone context variable is required.');
		}
		const supportEmail = this.node.tryGetContext('supportEmail');
		if (!supportEmail) {
			throw new Error('supportEmail context variable is required.');
		}

		// Create the Lambda functions.
		const commonLambdaProps = {
			architecture: Architecture.ARM_64,
			runtime: Runtime.NODEJS_20_X,
			timeout: Duration.seconds(10),
			handler: 'index.handler',
			environment: {
				C3_API_KEY: c3ApiKey,
				C3_VENDOR_ID: c3VendorId,
				C3_ENV: c3Env,
				LOGO_URL: logoUrl,
				SUPPORT_PHONE: supportPhone,
				SUPPORT_EMAIL: supportEmail,
			},
		};

		console.log('Creating function c3CreatePaymentRequest...');
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

		console.log('Creating function c3ReportCustomerActivity...');
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

		console.log('Creating function c3TokenizeTransaction...');
		const tokenizeTransactionFunction = new Function(
			this,
			'c3TokenizeTransaction',
			{
				...commonLambdaProps,
				description: 'Tokenizes customer payment details.',
				code: Code.fromAsset(
					path.join(__dirname, 'lambda/c3-tokenize-transaction'),
				),
			},
		);

		console.log('Creating function c3SubmitPayment...');
		const submitPaymentFunction = new Function(this, 'c3SubmitPayment', {
			...commonLambdaProps,
			description: 'Submits tokenized payment info to C3 for processing.',
			code: Code.fromAsset(path.join(__dirname, 'lambda/c3-submit-payment')),
		});

		const lambdaFunctions = [
			createPaymentRequestFunction,
			reportCustomerActivityFunction,
			tokenizeTransactionFunction,
			submitPaymentFunction,
		];
		for (const lambdaFunction of lambdaFunctions) {
			// Allow Amazon Connect to invoke the Lambda functions.
			// console.log('Adding Amazon Connect permissions for function...');
			// lambdaFunction.addToRolePolicy(
			// 	new PolicyStatement({
			// 		actions: ['lambda:InvokeFunction'],
			// 		resources: [lambdaFunction.functionArn],
			// 		effect: Effect.ALLOW,
			// 		principals: [new ServicePrincipal('connect.amazonaws.com')],
			// 	}),
			// );

			// Create an integration between the Lambda functions and Amazon Connect.
			console.log(
				'Creating Amazon Connect integration association for function...',
			);
			new CfnIntegrationAssociation(
				this,
				`ConnectIntegration${lambdaFunctions.indexOf(lambdaFunction) + 1}`,
				{
					instanceId: amazonConnectInstanceArn,
					integrationType: 'LAMBDA_FUNCTION',
					integrationArn: lambdaFunction.functionArn,
				},
			);
		}

		// Create the Amazon Connect flows.
		console.log('Creating flow module c3BaseDTMFPaymentFlowModule...');
		const baseDtmfPaymentFlowModuleContent =
			getBaseDtmfPaymentFlowModuleContent(
				createPaymentRequestFunction.functionArn,
				reportCustomerActivityFunction.functionArn,
				tokenizeTransactionFunction.functionArn,
				submitPaymentFunction.functionArn,
				amazonConnectSecurityKeyId,
				amazonConnectSecurityKeyCertificateContent,
			);

		new CfnContactFlowModule(this, 'c3BaseDTMFPaymentFlowModule', {
			name: 'C3 Base DTMF Payment',
			description: 'Flow module for collecting payments with C3 using DTMF.',
			content: baseDtmfPaymentFlowModuleContent,
			instanceArn: amazonConnectInstanceArn,
		});
	}
}
