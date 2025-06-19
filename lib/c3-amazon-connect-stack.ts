import { join } from 'path';
import { SecretValue, Stack, StackProps } from 'aws-cdk-lib';
import { CfnIntegrationAssociation } from 'aws-cdk-lib/aws-connect';
import {
	Code,
	CodeSigningConfig,
	Function,
	LayerVersion,
} from 'aws-cdk-lib/aws-lambda';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { SigningProfile, Platform } from 'aws-cdk-lib/aws-signer';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { CfnApplication } from 'aws-cdk-lib/aws-appintegrations';

import { Zift } from './payment-gateways/zift';
import { AgentAssistedPaymentIVR, SelfServicePaymentIVR } from './features';
import {
	associateLambdaFunctionsWithConnect,
	commonLambdaLayerProps,
	commonLambdaProps,
} from './helpers/lambda';
import { SubjectLookup } from './features/subject-lookup';
import {
	AmazonConnectContext,
	C3Context,
	C3PaymentGateway,
	FeaturesContext,
	OptionsContext,
	validateAmazonConnectContext,
	validateC3Context,
	validateFeaturesContext,
	validateOptionsContext,
} from './models';
import { writeFileToExports } from './helpers/file';
import { ReceiptApp } from './features/receipt-app';

export class C3AmazonConnectStack extends Stack {
	private c3BaseUrl: string;
	private c3AppUrlFragment: string;

	// Context variables.
	private stackLabel: string;
	private amazonConnectContext: AmazonConnectContext;
	private c3Context: C3Context;
	private featuresContext: FeaturesContext;
	private optionsContext: OptionsContext;

	// Resource references.
	private codeSigningConfig: CodeSigningConfig;
	private c3ApiKeySecret: Secret;
	private privateKeySecret: Secret;
	private utilsLayer: LayerVersion;
	private validateEntryFunction: Function;
	private tokenizeTransactionFunction: Function;
	private submitPaymentFunction: Function;
	private sendReceiptFunction: Function;

	private agentAssistedIVRResources: AgentAssistedPaymentIVR;

	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props);
		this.validateContextVariables();
		this.setC3BaseUrl();

		// Create resources needed for all features.
		if (this.optionsContext.codeSigning) {
			this.createCodeSigningConfig();
		}
		this.createC3ApiKeySecret();

		// Create resources needed for IVR payments.
		if (
			this.featuresContext.selfServiceIVR ||
			this.featuresContext.agentAssistedIVR
		) {
			this.createPrivateKeySecret();
			this.createUtilsLayer();
			this.createValidateEntryFunction();
			this.createTokenizeTransactionFunction();
			this.createSubmitPaymentFunction();
			this.createSendReceiptFunction();
			associateLambdaFunctionsWithConnect(this, [
				this.validateEntryFunction,
				this.tokenizeTransactionFunction,
				this.submitPaymentFunction,
				this.sendReceiptFunction,
			]);
		}

		// Create resources needed for each feature.
		if (this.featuresContext.selfServiceIVR) {
			new SelfServicePaymentIVR(
				this,
				this.amazonConnectContext.instanceArn,
				this.amazonConnectContext,
				this.codeSigningConfig,
				this.c3BaseUrl,
				this.c3ApiKeySecret,
				this.utilsLayer,
				this.tokenizeTransactionFunction,
				this.submitPaymentFunction,
				this.sendReceiptFunction,
				this.validateEntryFunction,
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
				this.utilsLayer,
				this.tokenizeTransactionFunction,
				this.submitPaymentFunction,
				this.sendReceiptFunction,
				this.validateEntryFunction,
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
			const paymentRequestAppUrl = this.getPaymentRequestAppUrl(
				!this.amazonConnectContext.addAppsToWorkspace,
			);
			if (this.amazonConnectContext.addAppsToWorkspace) {
				this.createPaymentRequestApp(paymentRequestAppUrl);
			}

			// Create resources needed for agent-assisted receipt app.
			if (this.featuresContext.receiptApp) {
				new ReceiptApp(
					this,
					this.stackLabel,
					this.amazonConnectContext,
					this.sendReceiptFunction,
					this.agentAssistedIVRResources?.sendAgentMessageFunction,
					this.agentAssistedIVRResources?.hoursOfOperation,
					this.agentAssistedIVRResources?.iamRole?.roleArn,
					this.c3AppUrlFragment,
				);
			}
		}
	}

	/**
	 * Ensures that all required context variables are set. Throws an error if any are missing.
	 */
	private validateContextVariables(): void {
		this.stackLabel = this.node.tryGetContext('stackLabel');

		this.amazonConnectContext = this.node.tryGetContext('amazonConnect');
		validateAmazonConnectContext(this.amazonConnectContext);

		this.c3Context = this.node.tryGetContext('c3');
		validateC3Context(this.c3Context);

		this.featuresContext = this.node.tryGetContext('features');
		validateFeaturesContext(this.featuresContext);

		this.optionsContext = this.node.tryGetContext('options');
		validateOptionsContext(this.optionsContext);
	}

	/**
	 * Sets the base URL for the C3 API based on the environment.
	 */
	private setC3BaseUrl(): void {
		switch (this.c3Context.env) {
			case 'prod':
				this.c3BaseUrl = 'https://api.call2action.link';
				this.c3AppUrlFragment = 'agent-apps.call2action.link';
				break;
			case 'staging':
				this.c3BaseUrl =
					'https://mstp8ccw53.execute-api.us-west-2.amazonaws.com/staging';
				this.c3AppUrlFragment = 'agent-apps.staging.c2a.link';
				break;
			case 'dev':
				this.c3BaseUrl =
					'https://xr1n4f5p34.execute-api.us-west-2.amazonaws.com/dev';
				this.c3AppUrlFragment = 'agent-apps.dev.c2a.link';
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
		const secretLabel = this.stackLabel
			? `_${this.stackLabel.toUpperCase()}`
			: '';
		this.c3ApiKeySecret = new Secret(this, 'C3APIKey', {
			secretName: 'C3_API_KEY' + secretLabel,
			secretStringValue: SecretValue.unsafePlainText('<Your C3 API key>'),
			description: 'The API key used for C3 Payment.',
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
		const secretLabel = this.stackLabel
			? `_${this.stackLabel.toUpperCase()}`
			: '';
		this.privateKeySecret = new Secret(this, 'C3PrivateKey', {
			secretName: 'C3_PRIVATE_KEY' + secretLabel,
			secretStringValue: SecretValue.unsafePlainText(
				'<The content of your private key>',
			),
			description: 'The private key for decrypting payment information for C3.',
		});
	}

	/**
	 * Creates a Lambda layer for utility functions.
	 *
	 * This layer is necessary for the Lambda functions to access utility functions that are shared across multiple functions.
	 */
	private createUtilsLayer(): void {
		console.log('Creating layer for utility functions...');
		this.utilsLayer = new LayerVersion(this, 'C3UtilsLayer', {
			...commonLambdaLayerProps,
			description: 'Utility functions for C3 payment processing.',
			code: Code.fromAsset(join(__dirname, 'lambda/c3-utils-layer/lib')),
		});
	}

	/**
	 * Creates a Lambda function for validating the customer's entry in the IVR.
	 *
	 * This function is necessary to validate credit card and bank account information entered by the customer.
	 */
	private createValidateEntryFunction(): void {
		console.log('Creating function C3ValidateEntry...');
		this.validateEntryFunction = new Function(this, 'C3ValidateEntry', {
			...commonLambdaProps,
			description: "Validates a customer's entry in the C3 payment IVR(s).",
			code: Code.fromAsset(join(__dirname, 'lambda/c3-validate-entry')),
			environment: {
				C3_PRIVATE_KEY_SECRET_ID: this.privateKeySecret.secretName,
				CONNECT_SECURITY_KEY_ID: this.amazonConnectContext.securityKeyId,
			},
			codeSigningConfig: this.optionsContext.codeSigning
				? this.codeSigningConfig
				: undefined,
			layers: [this.utilsLayer],
		});

		// Create policies for decrypting payment information.
		const decryptPolicy = new PolicyStatement({
			actions: ['kms:Decrypt'],
			resources: ['*'],
		});
		this.validateEntryFunction.addToRolePolicy(decryptPolicy);

		const getSecretValuePolicy = new PolicyStatement({
			actions: ['secretsmanager:GetSecretValue'],
			resources: [this.privateKeySecret.secretArn],
		});
		this.validateEntryFunction.addToRolePolicy(getSecretValuePolicy);
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
					C3_PRIVATE_KEY_SECRET_ID: this.privateKeySecret.secretName,
					C3_PAYMENT_GATEWAY: this.c3Context.paymentGateway,
					CONNECT_SECURITY_KEY_ID: this.amazonConnectContext.securityKeyId,
				},
				codeSigningConfig: this.optionsContext.codeSigning
					? this.codeSigningConfig
					: undefined,
				layers: [this.utilsLayer],
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
				new Zift(
					this,
					this.tokenizeTransactionFunction,
					getSecretValuePolicy,
					this.stackLabel,
				);
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
				C3_API_KEY_SECRET_ID: this.c3ApiKeySecret.secretName,
			},
			codeSigningConfig: this.optionsContext.codeSigning
				? this.codeSigningConfig
				: undefined,
			layers: [this.utilsLayer],
		});

		// Create the policy for getting secret values.
		const getSecretValuePolicy = new PolicyStatement({
			actions: ['secretsmanager:GetSecretValue'],
			resources: [this.c3ApiKeySecret.secretArn],
		});
		this.submitPaymentFunction.addToRolePolicy(getSecretValuePolicy);
	}

	/**
	 * Creates a Lambda function for sending a receipt.
	 *
	 * This function is necessary for your payment flow to send a receipt to the customer using C3 after the payment has been processed.
	 */
	private createSendReceiptFunction(): void {
		console.log('Creating function C3SendReceipt...');
		this.sendReceiptFunction = new Function(this, 'C3SendReceipt', {
			...commonLambdaProps,
			description: 'Sends a payment receipt using the C3 API.',
			code: Code.fromAsset(join(__dirname, 'lambda/c3-send-receipt')),
			environment: {
				C3_BASE_URL: this.c3BaseUrl,
				C3_API_KEY_SECRET_ID: this.c3ApiKeySecret.secretName,
			},
			codeSigningConfig: this.optionsContext.codeSigning
				? this.codeSigningConfig
				: undefined,
			layers: [this.utilsLayer],
		});

		// Create the policy for getting secret values.
		const getSecretValuePolicy = new PolicyStatement({
			actions: ['secretsmanager:GetSecretValue'],
			resources: [this.c3ApiKeySecret.secretArn],
		});
		this.sendReceiptFunction.addToRolePolicy(getSecretValuePolicy);
	}

	/**
	 * Creates a 3rd party application to be used for agent-assisted payments and associates it with your Amazon Connect instance.
	 *
	 * @param appUrl The URL for the 3rd party application.
	 * This app is required in order for an agent to initiate a payment while on a call with a customer. Once created, it will show as
	 * an app in the agent workspace. NOTE: You will also have to enable this app to viewed on the security profile for your agents.
	 */
	private createPaymentRequestApp(appUrl: string): void {
		console.log('Creating payment request application...');

		// Create the app.
		const stackLabelTitleCase =
			this.stackLabel.charAt(0).toUpperCase() + this.stackLabel.slice(1);
		const appLabel = this.stackLabel ? ` - ${stackLabelTitleCase}` : '';
		const application = new CfnApplication(
			this,
			`C3ConnectPaymentRequestApp${stackLabelTitleCase}`,
			{
				name: 'Payment Request' + appLabel, // App name is unfortunately required to be unique to create.
				namespace: `c3-payment-${this.stackLabel}`,
				description: 'Agent application for collecting payments with C3.',
				permissions: ['User.Details.View', 'Contact.Details.View'],
				applicationSourceConfig: {
					externalUrlConfig: {
						accessUrl: appUrl,
						approvedOrigins: [], // Don't allow any other origins.
					},
				},
			},
		);

		// Workaround to delete the existing associations. Necessary when the naming format changes.
		const skipAssociations =
			this.node.tryGetContext('options').skipAssociations;
		if (skipAssociations) {
			console.log('⚠️ Skipping Amazon Connect associations! ⚠️');
			return;
		}

		// Associate the app with the Amazon Connect instance.
		new CfnIntegrationAssociation(
			this,
			`C3ConnectPaymentRequestIntegrationApp`,
			{
				instanceId: this.amazonConnectContext.instanceArn,
				integrationType: 'APPLICATION',
				integrationArn: application.attrApplicationArn,
			},
		);
	}

	/**
	 * Gets the URL to be used for the C3 Payment Request app.
	 *
	 * @param customEmbed Whether to use a custom embed URL for the app.
	 * @returns The URL for the app.
	 */
	private getPaymentRequestAppUrl(customEmbed: boolean): string {
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
		if (customEmbed) {
			configuredFeatureParams += '&customEmbed=true';
		}

		const appUrl = `https://${this.c3AppUrlFragment}/agent-workspace/payment-request?contactCenter=amazon&instanceId=${instanceId}&region=${region}${agentAssistedIVRParams}${configuredFeatureParams}`;
		writeFileToExports(
			'C3PaymentRequestAppUrl.txt',
			`💰 Your C3 Payment Request app URL is:\n\n🌐 ${appUrl}\n`,
		);
		return appUrl;
	}
}
