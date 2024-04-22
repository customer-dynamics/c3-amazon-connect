import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Duration, SecretValue, Stack, StackProps } from 'aws-cdk-lib';
import {
	CfnContactFlowModule,
	CfnIntegrationAssociation,
} from 'aws-cdk-lib/aws-connect';
import {
	Architecture,
	Code,
	CodeSigningConfig,
	Function,
	Runtime,
} from 'aws-cdk-lib/aws-lambda';
import { PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { SigningProfile, Platform } from 'aws-cdk-lib/aws-signer';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { CfnApplication } from 'aws-cdk-lib/aws-appintegrations';

import { getBaseDtmfPaymentFlowModuleContent } from './connect/content-transformations.js';
import {
	AmazonConnectContext,
	validateAmazonConnectContext,
} from './models/amazon-connect-context.js';
import { C3Context, validateC3Context } from './models/c3-context.js';
import { C3PaymentGateway } from './models/enums/c3-payment-gateway.js';
import { FeaturesContext } from './models/features-context.js';
import { Zift } from './payment-gateways/zift.js';

export class C3AmazonConnectStack extends Stack {
	private amazonConnectContext: AmazonConnectContext;
	private c3Context: C3Context;
	private featuresContext: FeaturesContext;

	logoUrl: string;
	supportPhone: string;
	supportEmail: string;

	// Resources
	createPaymentRequestFunction: Function;
	reportCustomerActivityFunction: Function;
	tokenizeTransactionFunction: Function;
	submitPaymentFunction: Function;
	emailReceiptFunction: Function;

	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props);

		// Validate inputs.
		this.amazonConnectContext = this.node.tryGetContext('amazonConnect');
		validateAmazonConnectContext(this.amazonConnectContext);
		this.c3Context = this.node.tryGetContext('c3');
		validateC3Context(this.c3Context);
		this.featuresContext = this.node.tryGetContext('features');
		this.logoUrl = this.node.tryGetContext('logoUrl');
		this.supportPhone = this.node.tryGetContext('supportPhone');
		this.supportEmail = this.node.tryGetContext('supportEmail');

		// Create resources.
		this.validateContextVariables();
		this.createLambdaFunctions();
		this.createAmazonConnectFlows();

		// Create resources for agent-initiated payments.
		if (
			this.featuresContext.agentInitiatedDTMF ||
			this.featuresContext.agentInitiatedDigital
		) {
			this.create3rdPartyApp();
		}
	}

	/**
	 * Ensures that all required context variables are set. Throws an error if any are missing.
	 */
	private validateContextVariables(): void {
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
	private createLambdaFunctions(): void {
		// Set up code signing.
		const signingProfile = new SigningProfile(this, 'SigningProfile', {
			platform: Platform.AWS_LAMBDA_SHA384_ECDSA,
		});
		const codeSigningConfig = new CodeSigningConfig(this, 'CodeSigningConfig', {
			signingProfiles: [signingProfile],
		});

		// Create the Lambda functions.
		const commonLambdaProps = {
			codeSigningConfig,
			architecture: Architecture.ARM_64,
			runtime: Runtime.NODEJS_20_X,
			timeout: Duration.seconds(8),
			handler: 'index.handler',
			environment: {
				C3_API_KEY: this.c3Context.apiKey,
				C3_VENDOR_ID: this.c3Context.vendorId,
				C3_ENV: this.c3Context.env,
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
					join(__dirname, 'lambda/c3-create-payment-request'),
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
					join(__dirname, 'lambda/c3-report-customer-activity'),
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
				code: Code.fromAsset(join(__dirname, 'lambda/c3-tokenize-transaction')),
				environment: {
					...commonLambdaProps.environment,
					CONNECT_KEY_ID: this.amazonConnectContext.securityKeyId,
					C3_PAYMENT_GATEWAY: this.c3Context.paymentGateway,
					GATEWAY_URL: this.getGatewayUrl(),
				},
			},
		);
		// Secrets needed for working with the gateway
		console.log('Creating decryption secrets for Amazon Connect...');
		const privateKeySM = new Secret(this, 'privateKeySM', {
			secretName: 'C3_CONNECT_INPUT_DECRYPTION_KEY',
			secretStringValue: SecretValue.unsafePlainText('update with key text'),
			description: 'The key for decrypting payment information for C3.',
		});

		console.log('Creating policy for decrypting...');
		const tokenizeDecryptPolicy = new PolicyStatement();
		tokenizeDecryptPolicy.addActions('kms:Decrypt');
		tokenizeDecryptPolicy.addResources('*');

		this.tokenizeTransactionFunction.addToRolePolicy(tokenizeDecryptPolicy);

		console.log('Create batch get secrets policy');
		const tokenizeBatchPolicySM = new PolicyStatement();
		tokenizeBatchPolicySM.addActions(
			'secretsmanager:BatchGetSecretValue',
			'secretsmanager:ListSecrets',
		);
		tokenizeBatchPolicySM.addResources('*');

		this.tokenizeTransactionFunction.addToRolePolicy(tokenizeBatchPolicySM);

		console.log('Creating policy for secrets manager...');
		const tokenizePolicySM = new PolicyStatement();
		tokenizePolicySM.addActions(
			'secretsmanager:GetSecretValue',
			'secretsmanager:DescribeSecret',
		);
		tokenizePolicySM.addResources(privateKeySM.secretArn);

		// Create secrets for payment gateway.
		new Zift(this, tokenizePolicySM);

		this.tokenizeTransactionFunction.addToRolePolicy(tokenizePolicySM);

		console.log('Creating function c3SubmitPayment...');
		this.submitPaymentFunction = new Function(this, 'c3SubmitPayment', {
			...commonLambdaProps,
			description: 'Submits tokenized payment info to C3 for processing.',
			code: Code.fromAsset(join(__dirname, 'lambda/c3-submit-payment')),
			environment: {
				...commonLambdaProps.environment,
				GATEWAY_URL: this.getGatewayUrl(),
				C3_PAYMENT_GATEWAY: this.c3Context.paymentGateway,
			},
		});

		console.log('Creating function c3EmailReceipt...');
		this.emailReceiptFunction = new Function(this, 'c3EmailReceipt', {
			...commonLambdaProps,
			description: 'Creates a payment request through the C3 API.',
			code: Code.fromAsset(join(__dirname, 'lambda/c3-email-receipt')),
		});

		const lambdaFunctions = [
			this.createPaymentRequestFunction,
			this.reportCustomerActivityFunction,
			this.tokenizeTransactionFunction,
			this.submitPaymentFunction,
			this.emailReceiptFunction,
		];
		for (const lambdaFunction of lambdaFunctions) {
			// Allow Amazon Connect to invoke the Lambda functions.
			console.log('Adding Amazon Connect permissions for function...');
			lambdaFunction.addPermission('AllowAmazonConnectInvoke', {
				principal: new ServicePrincipal('connect.amazonaws.com'),
				sourceArn: this.amazonConnectContext.instanceArn,
				sourceAccount: this.account,
				action: 'lambda:InvokeFunction',
			});

			// Create an integration between the Lambda functions and Amazon Connect.
			console.log(
				'Creating Amazon Connect integration association for function...',
			);
			new CfnIntegrationAssociation(
				this,
				`ConnectIntegration${lambdaFunctions.indexOf(lambdaFunction) + 1}`,
				{
					instanceId: this.amazonConnectContext.instanceArn,
					integrationType: 'LAMBDA_FUNCTION',
					integrationArn: lambdaFunction.functionArn,
				},
			);
		}
	}

	/**
	 * Creates the Amazon Connect flows.
	 */
	private createAmazonConnectFlows(): void {
		console.log('Creating flow module c3BaseDTMFPaymentFlowModule...');
		const baseDtmfPaymentFlowModuleContent =
			getBaseDtmfPaymentFlowModuleContent(
				this.createPaymentRequestFunction,
				this.reportCustomerActivityFunction,
				this.tokenizeTransactionFunction,
				this.submitPaymentFunction,
				this.emailReceiptFunction,
				this.amazonConnectContext.securityKeyId,
				this.amazonConnectContext.securityKeyCertificateContent,
			);
		if (!existsSync('./exports')) {
			mkdirSync('./exports');
		}
		writeFileSync(
			'./exports/c3BaseDTMFPaymentFlowModule',
			baseDtmfPaymentFlowModuleContent,
		);
		new CfnContactFlowModule(this, 'c3BaseDTMFPaymentFlowModule', {
			name: 'C3 Base DTMF Payment',
			description: 'Flow module for collecting payments with C3 using DTMF.',
			content: baseDtmfPaymentFlowModuleContent,
			instanceArn: this.amazonConnectContext.instanceArn,
		});
	}

	/**
	 * Creates a 3rd party application to be used for agent-initiated payments and associates it with your Amazon Connect instance.
	 *
	 * This is required in order for an agent to initiate a payment while on a call with a customer.
	 */
	private create3rdPartyApp(): void {
		console.log('Creating 3rd party application...');
		// Create the app.
		const instanceId = this.amazonConnectContext.instanceArn.split('/')[1];
		const application = new CfnApplication(this, 'C3AmazonConnectApp', {
			name: 'C3 Payment',
			namespace: 'c3-payment',
			description: 'Agent application for collecting payments with C3.',
			applicationSourceConfig: {
				externalUrlConfig: {
					accessUrl: `https://${this.c3Context.vendorId}.dev.c2a.link/agent-workspace?instanceId=${instanceId}`,
					approvedOrigins: [], // Don't allow any other origins.
				},
			},
		});

		// Associate the app with the Amazon Connect instance.
		new CfnIntegrationAssociation(this, `ConnectIntegrationC3App`, {
			instanceId: this.amazonConnectContext.instanceArn,
			integrationType: 'APPLICATION',
			integrationArn: application.attrApplicationArn,
		});
	}

	/**
	 * Gets the URL used for the payment gateway.
	 *
	 * @returns The payment gateway URL.
	 */
	private getGatewayUrl() {
		switch (this.c3Context.paymentGateway) {
			case C3PaymentGateway.Zift:
				return 'https://secure.zift.io/gates/xurl?';
			default:
				throw new Error(
					`Invalid payment gateway: ${this.c3Context.paymentGateway}`,
				);
		}
	}
}
