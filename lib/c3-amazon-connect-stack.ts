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
	amazonConnectInstanceArn: string;
	amazonConnectSecurityKeyId: string;
	amazonConnectSecurityKeyCertificateContent: string;
	c3Env: string;
	c3ApiKey: string;
	c3VendorId: string;
	logoUrl: string;
	supportPhone: string;
	supportEmail: string;

	// Resources
	createPaymentRequestFunction: Function;
	reportCustomerActivityFunction: Function;
	tokenizeTransactionFunction: Function;
	submitPaymentFunction: Function;

	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props);

		this.amazonConnectInstanceArn = this.node.tryGetContext(
			'amazonConnectInstanceArn',
		);
		this.amazonConnectSecurityKeyId = this.node.tryGetContext(
			'amazonConnectSecurityKeyId',
		);
		this.amazonConnectSecurityKeyCertificateContent = this.node.tryGetContext(
			'amazonConnectSecurityKeyCertificateContent',
		);
		this.c3Env = this.node.tryGetContext('c3Env');
		this.c3ApiKey = this.node.tryGetContext('c3ApiKey');
		this.c3VendorId = this.node.tryGetContext('c3VendorId');
		this.logoUrl = this.node.tryGetContext('logoUrl');
		this.supportPhone = this.node.tryGetContext('supportPhone');
		this.supportEmail = this.node.tryGetContext('supportEmail');

		this.validateContextVariables();
		this.createLambdaFunctions();
		this.createAmazonConnectFlows();
	}

	/**
	 * Ensures that all required context variables are set. Throws an error if any are missing.
	 */
	validateContextVariables() {
		console.log('Validating context variables...');
		if (!this.amazonConnectInstanceArn) {
			throw new Error('amazonConnectInstanceArn context variable is required.');
		}
		if (!this.amazonConnectSecurityKeyId) {
			throw new Error(
				'amazonConnectSecurityKeyId context variable is required.',
			);
		}
		if (!this.amazonConnectSecurityKeyCertificateContent) {
			throw new Error(
				'amazonConnectSecurityKeyCertificateContent context variable is required.',
			);
		}
		if (!this.c3Env) {
			throw new Error('c3Env context variable is required.');
		}
		if (!this.c3ApiKey) {
			throw new Error('c3ApiKey context variable is required.');
		}
		if (!this.c3VendorId) {
			throw new Error('c3VendorId context variable is required.');
		}
		if (!this.logoUrl) {
			throw new Error('logoUrl context variable is required.');
		}
		if (!this.supportPhone) {
			throw new Error('supportPhone context variable is required.');
		}
		if (!this.supportEmail) {
			throw new Error('supportEmail context variable is required.');
		}
	}

	/**
	 * Creates the Lambda functions and integrates them with Amazon Connect.
	 */
	createLambdaFunctions() {
		// Create the Lambda functions.
		const commonLambdaProps = {
			architecture: Architecture.ARM_64,
			runtime: Runtime.NODEJS_20_X,
			timeout: Duration.seconds(10),
			handler: 'index.handler',
			environment: {
				C3_API_KEY: this.c3ApiKey,
				C3_VENDOR_ID: this.c3VendorId,
				C3_ENV: this.c3Env,
				LOGO_URL: this.logoUrl,
				SUPPORT_PHONE: this.supportPhone,
				SUPPORT_EMAIL: this.supportEmail,
			},
		};

		console.log('Creating function c3CreatePaymentRequest...');
		this.createPaymentRequestFunction = new Function(
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
		this.reportCustomerActivityFunction = new Function(
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
		this.tokenizeTransactionFunction = new Function(
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
		this.submitPaymentFunction = new Function(this, 'c3SubmitPayment', {
			...commonLambdaProps,
			description: 'Submits tokenized payment info to C3 for processing.',
			code: Code.fromAsset(path.join(__dirname, 'lambda/c3-submit-payment')),
		});

		const lambdaFunctions = [
			this.createPaymentRequestFunction,
			this.reportCustomerActivityFunction,
			this.tokenizeTransactionFunction,
			this.submitPaymentFunction,
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
					instanceId: this.amazonConnectInstanceArn,
					integrationType: 'LAMBDA_FUNCTION',
					integrationArn: lambdaFunction.functionArn,
				},
			);
		}
	}

	/**
	 * Creates the Amazon Connect flows.
	 */
	createAmazonConnectFlows() {
		console.log('Creating flow module c3BaseDTMFPaymentFlowModule...');
		const baseDtmfPaymentFlowModuleContent =
			getBaseDtmfPaymentFlowModuleContent(
				this.createPaymentRequestFunction.functionArn,
				this.reportCustomerActivityFunction.functionArn,
				this.tokenizeTransactionFunction.functionArn,
				this.submitPaymentFunction.functionArn,
				this.amazonConnectSecurityKeyId,
				this.amazonConnectSecurityKeyCertificateContent,
			);

		new CfnContactFlowModule(this, 'c3BaseDTMFPaymentFlowModule', {
			name: 'C3 Base DTMF Payment',
			description: 'Flow module for collecting payments with C3 using DTMF.',
			content: baseDtmfPaymentFlowModuleContent,
			instanceArn: this.amazonConnectInstanceArn,
		});
	}
}
