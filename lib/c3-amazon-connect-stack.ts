import { join } from 'path';
import { SecretValue, Stack, StackProps } from 'aws-cdk-lib';
import { CfnIntegrationAssociation } from 'aws-cdk-lib/aws-connect';
import { Code, CodeSigningConfig, Function } from 'aws-cdk-lib/aws-lambda';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { SigningProfile, Platform } from 'aws-cdk-lib/aws-signer';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { CfnApplication } from 'aws-cdk-lib/aws-appintegrations';

import {
	AmazonConnectContext,
	validateAmazonConnectContext,
} from './models/amazon-connect-context';
import { C3Context, validateC3Context } from './models/c3-context';
import {
	FeaturesContext,
	validateFeaturesContext,
} from './models/features-context';
import { Zift } from './payment-gateways/zift';
import { AgentAssistedPaymentIVR, SelfServicePaymentIVR } from './features';
import {
	associateLambdaFunctionsWithConnect,
	commonLambdaProps,
} from './helpers/lambda';
import { C3PaymentGateway } from './models/enums/c3-payment-gateway';
import { SubjectLookup } from './features/subject-lookup';

export class C3AmazonConnectStack extends Stack {
	private c3BaseUrl: string;

	// Context variables.
	private amazonConnectContext: AmazonConnectContext;
	private c3Context: C3Context;
	private featuresContext: FeaturesContext;
	private logoUrl: string;
	private supportPhone: string;
	private supportEmail: string;

	// Resource references.
	private codeSigningConfig: CodeSigningConfig;
	private c3ApiKeySecret: Secret;
	private privateKeySecret: Secret;
	private createPaymentRequestFunction: Function;
	private tokenizeTransactionFunction: Function;
	private submitPaymentFunction: Function;
	private emailReceiptFunction: Function;

	private agentAssistedIVRResources: AgentAssistedPaymentIVR;

	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props);
		this.validateContextVariables();
		this.setC3BaseUrl();

		// Create resources needed for all features.
		this.createCodeSigningConfig();
		this.createC3ApiKeySecret();

		// Create resources needed for IVR payments.
		if (
			this.featuresContext.selfServiceIVR ||
			this.featuresContext.agentAssistedIVR
		) {
			this.createPrivateKeySecret();
			this.createCreatePaymentRequestFunction();
			this.createTokenizeTransactionFunction();
			this.createSubmitPaymentFunction();
			this.createEmailReceiptFunction();
			associateLambdaFunctionsWithConnect(this, [
				this.createPaymentRequestFunction,
				this.tokenizeTransactionFunction,
				this.submitPaymentFunction,
				this.emailReceiptFunction,
			]);
		}

		// Create resources needed for each feature.
		if (this.featuresContext.selfServiceIVR) {
			new SelfServicePaymentIVR(
				this,
				this.amazonConnectContext.instanceArn,
				this.amazonConnectContext,
				this.createPaymentRequestFunction,
				this.tokenizeTransactionFunction,
				this.submitPaymentFunction,
				this.emailReceiptFunction,
			);
		}
		if (this.featuresContext.agentAssistedIVR) {
			this.agentAssistedIVRResources = new AgentAssistedPaymentIVR(
				this,
				this.amazonConnectContext.instanceArn,
				this.amazonConnectContext,
				this.codeSigningConfig,
				this.c3BaseUrl,
				this.c3ApiKeySecret,
				this.createPaymentRequestFunction,
				this.tokenizeTransactionFunction,
				this.submitPaymentFunction,
				this.emailReceiptFunction,
			);
		}
		if (this.featuresContext.subjectLookup) {
			if (!this.agentAssistedIVRResources) {
				throw new Error(
					'Agent-assisted IVR resources are required for subject lookup.',
				);
			}
			new SubjectLookup(
				this,
				this.amazonConnectContext,
				this.codeSigningConfig,
				this.agentAssistedIVRResources?.sendAgentMessageFunction,
				this.agentAssistedIVRResources?.hoursOfOperation,
			);
		}

		// Create resources needed for agent-assisted payment requests.
		if (
			this.featuresContext.agentAssistedIVR ||
			this.featuresContext.agentAssistedLink
		) {
			this.create3rdPartyApp();
		}
	}

	/**
	 * Ensures that all required context variables are set. Throws an error if any are missing.
	 */
	private validateContextVariables(): void {
		this.amazonConnectContext = this.node.tryGetContext('amazonConnect');
		validateAmazonConnectContext(this.amazonConnectContext);

		this.c3Context = this.node.tryGetContext('c3');
		validateC3Context(this.c3Context);

		this.featuresContext = this.node.tryGetContext('features');
		validateFeaturesContext(this.featuresContext);

		this.logoUrl = this.node.tryGetContext('logoUrl');
		this.supportPhone = this.node.tryGetContext('supportPhone');
		this.supportEmail = this.node.tryGetContext('supportEmail');
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
	 * Sets the base URL for the C3 API based on the environment.
	 */
	private setC3BaseUrl(): void {
		switch (this.c3Context.env) {
			case 'prod':
				this.c3BaseUrl = 'https://api.call2action.link';
				break;
			case 'staging':
				this.c3BaseUrl =
					'https://mstp8ccw53.execute-api.us-west-2.amazonaws.com/staging';
				break;
			case 'dev':
				this.c3BaseUrl =
					'https://xr1n4f5p34.execute-api.us-west-2.amazonaws.com/dev';
				break;
			default:
				throw new Error(`Invalid environment: ${this.c3Context.env}`);
		}
	}

	/**
	 * Creates a code signing profile and configuration for the Lambda functions.
	 *
	 * This signing profile and configuration is necessary for extra security when Lambdas are working with sensitive data.
	 */
	private createCodeSigningConfig(): void {
		console.log('Creating code signing config...');
		const signingProfile = new SigningProfile(this, 'C3SigningProfile', {
			platform: Platform.AWS_LAMBDA_SHA384_ECDSA,
		});
		this.codeSigningConfig = new CodeSigningConfig(
			this,
			'C3CodeSigningConfig',
			{
				signingProfiles: [signingProfile],
			},
		);
	}

	/**
	 * Creates a secret for the API key assigned to your C3 vendor.
	 *
	 * This secret is required to securely provide the API key to the Lambda functions that interact with the C3 API.
	 */
	private createC3ApiKeySecret(): void {
		console.log('Creating secret for C3 API key...');
		this.c3ApiKeySecret = new Secret(this, 'C3APIKey', {
			secretName: 'C3_API_KEY',
			secretStringValue: SecretValue.unsafePlainText('<Your C3 API key>'),
			description: 'The API key used for C3 payments.',
		});
	}

	/**
	 * Creates a secret for the private key used to decrypt payment information.
	 *
	 * This secret is required for the Lambda function that tokenizes payment information. It must first decrypt the payment
	 * information using this private key before it can tokenize it.
	 */
	private createPrivateKeySecret(): void {
		console.log('Creating private key secret...');
		this.privateKeySecret = new Secret(this, 'C3PrivateKey', {
			secretName: 'C3_PRIVATE_KEY',
			secretStringValue: SecretValue.unsafePlainText(
				'<The content of your private key>',
			),
			description: 'The private key for decrypting payment information for C3.',
		});
	}

	/**
	 * Creates a Lambda function for creating a payment request.
	 *
	 * This function is necessary for your payment flow to create a payment request through the C3 API.
	 */
	private createCreatePaymentRequestFunction(): void {
		console.log('Creating function C3CreatePaymentRequest...');
		this.createPaymentRequestFunction = new Function(
			this,
			'C3CreatePaymentRequest',
			{
				...commonLambdaProps,
				description: 'Creates a payment request through the C3 API.',
				code: Code.fromAsset(
					join(__dirname, 'lambda/c3-create-payment-request'),
				),
				environment: {
					C3_VENDOR_ID: this.c3Context.vendorId,
					C3_BASE_URL: this.c3BaseUrl,
					LOGO_URL: this.logoUrl,
					SUPPORT_PHONE: this.supportPhone,
					SUPPORT_EMAIL: this.supportEmail,
				},
				codeSigningConfig: this.codeSigningConfig,
			},
		);

		// Create the policy for getting secret values.
		const getSecretValuePolicy = new PolicyStatement({
			actions: ['secretsmanager:GetSecretValue'],
			resources: [this.c3ApiKeySecret.secretArn],
		});
		this.createPaymentRequestFunction.addToRolePolicy(getSecretValuePolicy);
	}

	/**
	 * Creates a Lambda function for tokenizing payment details.
	 *
	 * This function is necessary for your payment flow to take the encrypted payment details and tokenize them for processing.
	 */
	private createTokenizeTransactionFunction(): void {
		console.log('Creating function C3TokenizeTransaction...');
		this.tokenizeTransactionFunction = new Function(
			this,
			'C3TokenizeTransaction',
			{
				...commonLambdaProps,
				description: 'Tokenizes customer payment details.',
				code: Code.fromAsset(join(__dirname, 'lambda/c3-tokenize-transaction')),
				environment: {
					C3_ENV: this.c3Context.env,
					C3_PAYMENT_GATEWAY: this.c3Context.paymentGateway,
					CONNECT_SECURITY_KEY_ID: this.amazonConnectContext.securityKeyId,
				},
				codeSigningConfig: this.codeSigningConfig,
			},
		);

		// Create policy for decrypting payment information.
		const decryptPolicy = new PolicyStatement({
			actions: ['kms:Decrypt'],
			resources: ['*'],
		});
		this.tokenizeTransactionFunction.addToRolePolicy(decryptPolicy);

		const getSecretValuePolicy = new PolicyStatement({
			actions: ['secretsmanager:GetSecretValue'],
			resources: [this.privateKeySecret.secretArn],
		});

		// Create additional payment gateway secrets and add to policy.
		switch (this.c3Context.paymentGateway) {
			case C3PaymentGateway.Zift:
				new Zift(this, getSecretValuePolicy);
				break;
			default:
				throw new Error(
					`Invalid payment gateway specified: ${this.c3Context.paymentGateway}`,
				);
		}
		this.tokenizeTransactionFunction.addToRolePolicy(getSecretValuePolicy);
	}

	/**
	 * Creates a Lambda function for submitting payment details.
	 *
	 * This function is necessary for your payment flow to submit the tokenized payment details to C3 for processing.
	 */
	private createSubmitPaymentFunction(): void {
		console.log('Creating function C3SubmitPayment...');
		this.submitPaymentFunction = new Function(this, 'C3SubmitPayment', {
			...commonLambdaProps,
			description: 'Submits tokenized payment info to C3 for processing.',
			code: Code.fromAsset(join(__dirname, 'lambda/c3-submit-payment')),
			environment: {
				C3_BASE_URL: this.c3BaseUrl,
			},
			codeSigningConfig: this.codeSigningConfig,
		});

		// Create the policy for getting secret values.
		const getSecretValuePolicy = new PolicyStatement({
			actions: ['secretsmanager:GetSecretValue'],
			resources: [this.c3ApiKeySecret.secretArn],
		});
		this.submitPaymentFunction.addToRolePolicy(getSecretValuePolicy);
	}

	/**
	 * Creates a Lambda function for sending an email receipt.
	 *
	 * This function is necessary for your payment flow to send an email receipt to the customer using C3 after the payment has been processed.
	 */
	private createEmailReceiptFunction(): void {
		console.log('Creating function C3EmailReceipt...');
		this.emailReceiptFunction = new Function(this, 'C3EmailReceipt', {
			...commonLambdaProps,
			description: 'Creates a payment request through the C3 API.',
			code: Code.fromAsset(join(__dirname, 'lambda/c3-email-receipt')),
			environment: {
				C3_BASE_URL: this.c3BaseUrl,
			},
			codeSigningConfig: this.codeSigningConfig,
		});

		// Create the policy for getting secret values.
		const getSecretValuePolicy = new PolicyStatement({
			actions: ['secretsmanager:GetSecretValue'],
			resources: [this.c3ApiKeySecret.secretArn],
		});
		this.emailReceiptFunction.addToRolePolicy(getSecretValuePolicy);
	}

	/**
	 * Creates a 3rd party application to be used for agent-assisted payments and associates it with your Amazon Connect instance.
	 *
	 * This app is required in order for an agent to initiate a payment while on a call with a customer. Once created, it will show as
	 * an app in the agent workspace. NOTE: You will also have to enable this app to viewed on the security profile for your agents.
	 */
	private create3rdPartyApp(): void {
		console.log('Creating 3rd party application...');
		const instanceId = this.amazonConnectContext.instanceArn.split('/')[1];

		// Set params for IVR features.
		const region = this.amazonConnectContext.instanceArn.split(':')[3];
		const externalRoleArn =
			this.agentAssistedIVRResources?.iamRole?.roleArn || '';
		const agentAssistedIVRParams = externalRoleArn
			? `&externalRoleArn=${externalRoleArn}`
			: '';

		// Add parameters to the URL for the specific features.
		let configuredFeatureParams = '';
		if (!this.featuresContext.agentAssistedIVR) {
			configuredFeatureParams += '&noIvr=true';
		}
		if (!this.featuresContext.agentAssistedLink) {
			configuredFeatureParams += '&noLink=true';
		}
		if (this.featuresContext.subjectLookup) {
			configuredFeatureParams += `&subjectLookup=${this.featuresContext.subjectLookup}`;
		}

		// Create the app.
		const application = new CfnApplication(this, 'C3ConnectApp', {
			name: 'Payment Request',
			namespace: 'c3-payment',
			description: 'Agent application for collecting payments with C3.',
			permissions: ['User.Details.View', 'Contact.Details.View'],
			applicationSourceConfig: {
				externalUrlConfig: {
					accessUrl: `https://${this.c3Context.vendorId}.dev.c2a.link/agent-workspace?contactCenter=amazon&instanceId=${instanceId}&region=${region}${agentAssistedIVRParams}${configuredFeatureParams}`,
					approvedOrigins: [], // Don't allow any other origins.
				},
			},
		});

		// Associate the app with the Amazon Connect instance.
		new CfnIntegrationAssociation(this, `C3ConnectIntegrationApp`, {
			instanceId: this.amazonConnectContext.instanceArn,
			integrationType: 'APPLICATION',
			integrationArn: application.attrApplicationArn,
		});
	}
}
