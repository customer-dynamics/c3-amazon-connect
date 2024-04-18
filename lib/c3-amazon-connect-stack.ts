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

import { getBaseDtmfPaymentFlowModuleContent } from './connect/content-transformations.js';

const GATEWAYS = ['Nexio', 'NMI', 'Zift', 'AuthNet'];

export class C3AmazonConnectStack extends Stack {
	amazonConnectInstanceArn: string;
	amazonConnectSecurityKeyId: string;
	amazonConnectSecurityKeyCertificateContent: string;
	c3Env: string;
	c3ApiKey: string;
	c3VendorId: string;
	c3PaymentGateway: string;
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
		this.c3PaymentGateway = this.node.tryGetContext('c3PaymentGateway');
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
	validateContextVariables(): void {
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
		if (!this.c3PaymentGateway) {
			throw new Error('c3PaymentGateway context variable is required.');
		}
		if (!GATEWAYS.includes(this.c3PaymentGateway)) {
			throw new Error(
				`c3PaymentGateway context variable must be one of ${GATEWAYS.join(
					', ',
				)}.`,
			);
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
	createLambdaFunctions(): void {
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
					CONNECT_KEY_ID: this.amazonConnectSecurityKeyId,
				}
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
		tokenizeBatchPolicySM.addActions('secretsmanager:BatchGetSecretValue', 'secretsmanager:ListSecrets');
		tokenizeBatchPolicySM.addResources('*');

		this.tokenizeTransactionFunction.addToRolePolicy(tokenizeBatchPolicySM);

		console.log('Creating policy for secrets manager...');
		const tokenizePolicySM = new PolicyStatement();
		tokenizePolicySM.addActions('secretsmanager:GetSecretValue', 'secretsmanager:DescribeSecret');
		tokenizePolicySM.addResources(
			privateKeySM.secretArn,
		);

		// Gateway-specific secrets.
		// Zift
		if (this.c3PaymentGateway === 'Zift') {
			console.log('Creating Zift secrets...');
			const ziftUserNameSM = new Secret(this, 'ziftUserNameSM', {
				secretName: 'ZIFT_USER_NAME',
				secretStringValue: SecretValue.unsafePlainText('update with user name'),
				description: 'The username for your Zift account.',
			});

			const ziftPasswordSM = new Secret(this, 'ziftPasswordSM', {
				secretName: 'ZIFT_PASSWORD',
				secretStringValue: SecretValue.unsafePlainText('update with password'),
				description: 'The password for your Zift account.',
			});

			const ziftAccountIdSM = new Secret(this, 'ziftAccountIdSM', {
				secretName: 'ZIFT_ACCOUNT_ID',
				secretStringValue: SecretValue.unsafePlainText(
					'update with account id',
				),
				description: 'The account ID for your Zift account.',
			});
			tokenizePolicySM.addResources(
				ziftUserNameSM.secretArn,
				ziftPasswordSM.secretArn,
				ziftAccountIdSM.secretArn,
			);
		}

		// Authorize.net
		if (this.c3PaymentGateway === 'AuthNet') {
			// Not Yet Implemented
		}

		this.tokenizeTransactionFunction.addToRolePolicy(tokenizePolicySM);

		console.log('Creating function c3SubmitPayment...');
		this.submitPaymentFunction = new Function(this, 'c3SubmitPayment', {
			...commonLambdaProps,
			description: 'Submits tokenized payment info to C3 for processing.',
			code: Code.fromAsset(join(__dirname, 'lambda/c3-submit-payment')),
			environment: {
				...commonLambdaProps.environment,
				GATEWAY_URL: this.getGatewayUrl(),
				C3_PAYMENT_GATEWAY: this.c3PaymentGateway,
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
				sourceArn: this.amazonConnectInstanceArn,
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
	createAmazonConnectFlows(): void {
		console.log('Creating flow module c3BaseDTMFPaymentFlowModule...');
		const baseDtmfPaymentFlowModuleContent =
			getBaseDtmfPaymentFlowModuleContent(
				this.createPaymentRequestFunction,
				this.reportCustomerActivityFunction,
				this.tokenizeTransactionFunction,
				this.submitPaymentFunction,
				this.emailReceiptFunction,
				this.amazonConnectSecurityKeyId,
				this.amazonConnectSecurityKeyCertificateContent,
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
			instanceArn: this.amazonConnectInstanceArn,
		});
	}

	/**
	 * Gets the URL used for the payment gateway.
	 *
	 * @returns The payment gateway URL.
	 */
	getGatewayUrl() {
		switch (this.c3PaymentGateway) {
			case 'Zift':
				return 'https://secure.zift.io/gates/xurl?';
			case 'Nexio':
				return 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX?';
			case 'NMI':
				return 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX?';
			case 'AuthNet':
				return 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX?';
			default:
				throw new Error(`Invalid payment gateway: ${this.c3PaymentGateway}`);
		}
	}
}
