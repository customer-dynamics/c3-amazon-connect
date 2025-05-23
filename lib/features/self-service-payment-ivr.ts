import { Stack } from 'aws-cdk-lib';
import { getPaymentIVRFlowModuleContent } from '../connect/content-transformations';
import { CfnContactFlowModule } from 'aws-cdk-lib/aws-connect';
import {
	Code,
	CodeSigningConfig,
	Function,
	LayerVersion,
} from 'aws-cdk-lib/aws-lambda';
import { AmazonConnectContext, C3Context, OptionsContext } from '../models';
import { writeFileToExports } from '../helpers/file';
import {
	associateLambdaFunctionsWithConnect,
	commonLambdaProps,
} from '../helpers/lambda';
import { join } from 'path';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

/**
 * Class for creating the necessary resources to facilitate self-service payments collected through IVR.
 */
export class SelfServicePaymentIVR {
	private createPaymentRequestFunction: Function;
	private logoUrl: string;
	private supportPhone: string;
	private supportEmail: string;

	/**
	 * Creates the necessary resources to facilitate self-service payments collected through IVR.
	 */
	constructor(
		private stack: Stack,
		private amazonConnectInstanceArn: string,
		private amazonConnectContext: AmazonConnectContext,
		private codeSigningConfig: CodeSigningConfig,
		private c3BaseUrl: string,
		private c3ApiKeySecret: Secret,
		private utilsLayer: LayerVersion,
		private tokenizeTransactionFunction: Function,
		private submitPaymentFunction: Function,
		private sendReceiptFunction: Function,
		private validateEntryFunction: Function,
	) {
		console.log('Creating resources for self-service IVR payments...');
		this.createCreatePaymentRequestFunction();
		associateLambdaFunctionsWithConnect(this.stack, [
			this.createPaymentRequestFunction,
		]);
		this.createFlowModule();
	}

	/**
	 * Creates a Lambda function for creating a payment request.
	 *
	 * This function is necessary for your payment flow to create a payment request through the C3 API.
	 */
	private createCreatePaymentRequestFunction(): void {
		console.log('Creating function C3CreatePaymentRequest...');

		// Validate values.
		const logoUrl = this.stack.node.tryGetContext('logoUrl');
		const supportPhone = this.stack.node.tryGetContext('supportPhone');
		const supportEmail = this.stack.node.tryGetContext('supportEmail');
		if (!logoUrl) {
			throw new Error('logoUrl context variable is required.');
		}
		if (!supportPhone) {
			throw new Error('supportPhone context variable is required.');
		}
		if (!supportEmail) {
			throw new Error('supportEmail context variable is required.');
		}

		// Create function.
		const c3Context = this.stack.node.tryGetContext('c3') as C3Context;
		const optionsContext = this.stack.node.tryGetContext(
			'options',
		) as OptionsContext;
		this.createPaymentRequestFunction = new Function(
			this.stack,
			'C3CreatePaymentRequest',
			{
				...commonLambdaProps,
				description: 'Creates a payment request through the C3 API.',
				code: Code.fromAsset(
					join(__dirname, '../lambda/c3-create-payment-request'),
				),
				environment: {
					C3_BASE_URL: this.c3BaseUrl,
					C3_VENDOR_ID: c3Context.vendorId,
					C3_API_KEY_SECRET_ID: this.c3ApiKeySecret.secretName,
					LOGO_URL: this.logoUrl,
					SUPPORT_PHONE: this.supportPhone,
					SUPPORT_EMAIL: this.supportEmail,
				},
				codeSigningConfig: optionsContext.codeSigning
					? this.codeSigningConfig
					: undefined,
				layers: [this.utilsLayer],
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
	 * Creates a flow module for self-service payments collected through IVR.
	 *
	 * This flow module contains the core process for collecting card information through IVR. It is to be invoked by your
	 * inbound contact flow when the required information is present in contact attributes.
	 */
	private createFlowModule(): void {
		console.log('Creating flow module C3PaymentIVRFlowModule...');
		const optionsContext = this.stack.node.tryGetContext(
			'options',
		) as OptionsContext;
		const paymentIVRFlowModuleContent = getPaymentIVRFlowModuleContent(
			this.createPaymentRequestFunction,
			this.tokenizeTransactionFunction,
			this.submitPaymentFunction,
			this.sendReceiptFunction,
			this.validateEntryFunction,
			this.amazonConnectContext.securityKeyId,
			this.amazonConnectContext.securityKeyCertificateContent,
			this.amazonConnectContext.receiptQueueArn,
			optionsContext.ivrSpeaking,
		);
		writeFileToExports(
			'C3PaymentIVRFlowModule.json',
			paymentIVRFlowModuleContent,
		);
		new CfnContactFlowModule(this.stack, 'C3PaymentIVRFlowModule', {
			name: 'C3 Payment IVR Flow Module',
			description:
				'Flow module to collect payments through a self-service IVR using C3.',
			content: paymentIVRFlowModuleContent,
			instanceArn: this.amazonConnectInstanceArn,
		});
	}
}
