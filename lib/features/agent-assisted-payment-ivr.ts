import { Stack } from 'aws-cdk-lib';
import {
	CfnContactFlow,
	CfnHoursOfOperation,
	CfnQueue,
	CfnQuickConnect,
} from 'aws-cdk-lib/aws-connect';
import {
	AccountPrincipal,
	Effect,
	ManagedPolicy,
	PolicyStatement,
	Role,
} from 'aws-cdk-lib/aws-iam';
import {
	Code,
	CodeSigningConfig,
	Function,
	LayerVersion,
} from 'aws-cdk-lib/aws-lambda';
import { join } from 'path';

import {
	associateLambdaFunctionsWithConnect,
	commonLambdaProps,
} from '../helpers/lambda';
import { getSelfServicePaymentIVRFlowContent } from '../connect/content-transformations';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { AmazonConnectContext, C3Context, OptionsContext } from '../models';
import { writeFileToExports } from '../helpers/file';

/**
 * Class for creating the necessary resources to facilitate agent-assisted payments collected through IVR.
 */
export class AgentAssistedPaymentIVR {
	public iamRole: Role;
	public hoursOfOperation: CfnHoursOfOperation;
	public sendAgentMessageFunction: Function;
	private ivrPaymentFlow: CfnContactFlow;
	private queue: CfnQueue;

	/**
	 * Creates the necessary resources to facilitate agent-assisted payments collected through IVR.
	 */
	constructor(
		private stack: Stack,
		private amazonConnectInstanceArn: string,
		private amazonConnectContext: AmazonConnectContext,
		private codeSigningConfig: CodeSigningConfig,
		private c3BaseUrl: string,
		private c3ApiKeySecret: Secret,
		private utilsLayer: LayerVersion,
		private createPaymentRequestFunction: Function,
		private tokenizeTransactionFunction: Function,
		private submitPaymentFunction: Function,
		private sendReceiptFunction: Function,
	) {
		console.log('Creating resources for agent-assisted IVR payments...');
		this.createSendAgentMessageFunction();
		associateLambdaFunctionsWithConnect(this.stack, [
			this.sendAgentMessageFunction,
		]);
		this.createIVRFlow();
		this.createHoursOfOperation();
		this.createQueue();
		this.createQuickConnect();
		this.createIAMRole();
		this.createIAMPolicy();
	}

	/**
	 * Creates a Lambda function for sending messages to the agent.
	 *
	 * This function is required to report payment activity and subject lookup info to the agent workspace. It is invoked by your
	 * payment and subject lookup flows to provide the agent with updates on activity.
	 */
	private createSendAgentMessageFunction(): void {
		console.log('Creating function C3SendAgentMessage...');

		// Create function.
		const c3Context = this.stack.node.tryGetContext('c3') as C3Context;
		const optionsContext = this.stack.node.tryGetContext(
			'options',
		) as OptionsContext;
		this.sendAgentMessageFunction = new Function(
			this.stack,
			'C3SendAgentMessage',
			{
				...commonLambdaProps,
				description: 'Sends a message through C3 to the agent workspace.',
				code: Code.fromAsset(
					join(__dirname, '../lambda/c3-send-agent-message'),
				),
				environment: {
					C3_ENV: c3Context.env,
					C3_BASE_URL: this.c3BaseUrl,
					C3_API_KEY_SECRET_ID: this.c3ApiKeySecret.secretName,
				},
				codeSigningConfig: optionsContext.codeSigning
					? this.codeSigningConfig
					: undefined,
				layers: [this.utilsLayer],
			},
		);

		// Create the policies for getting secret values.
		const getSecretValuePolicy = new PolicyStatement({
			actions: ['secretsmanager:GetSecretValue'],
			resources: [this.c3ApiKeySecret.secretArn],
		});
		this.sendAgentMessageFunction.addToRolePolicy(getSecretValuePolicy);
	}

	/**
	 * Creates a flow for agent-assisted IVR payments.
	 *
	 * This flow is required to collect payments from customers through IVR. It is initiated by the agent and guides the customer through the payment process.
	 */
	private createIVRFlow(): void {
		console.log('Creating flow C3AgentAssistedPaymentIVRFlow...');
		const c3PaymentFlowContent = getSelfServicePaymentIVRFlowContent(
			this.sendAgentMessageFunction,
			this.createPaymentRequestFunction,
			this.tokenizeTransactionFunction,
			this.submitPaymentFunction,
			this.sendReceiptFunction,
			this.amazonConnectContext.securityKeyId,
			this.amazonConnectContext.securityKeyCertificateContent,
		);
		writeFileToExports(
			'C3AgentAssistedPaymentIVRFlow.json',
			c3PaymentFlowContent,
		);
		this.ivrPaymentFlow = new CfnContactFlow(
			this.stack,
			'C3AgentAssistedPaymentIVRFlow',
			{
				name: 'C3 Agent-Assisted Payment IVR',
				description:
					'Flow for collecting payments with C3 through a quick connect IVR.',
				content: c3PaymentFlowContent,
				instanceArn: this.amazonConnectInstanceArn,
				type: 'QUEUE_TRANSFER',
			},
		);
	}

	/**
	 * Creates hours of operation for queues.
	 *
	 * These hours of operation are required because a queue must have hours of operation defined. This allows the payment queue to be available 24/7.
	 */
	private createHoursOfOperation(): void {
		console.log('Creating hours of operation...');
		this.hoursOfOperation = new CfnHoursOfOperation(
			this.stack,
			'C3HoursOfOperation',
			{
				instanceArn: this.amazonConnectInstanceArn,
				name: 'C3 Hours of Operation',
				description: 'Hours of operation for quick connects with C3.',
				timeZone: 'America/New_York',
				config: [
					{
						day: 'SUNDAY',
						startTime: {
							hours: 0,
							minutes: 0,
						},
						endTime: {
							hours: 23,
							minutes: 59,
						},
					},
					{
						day: 'MONDAY',
						startTime: {
							hours: 0,
							minutes: 0,
						},
						endTime: {
							hours: 23,
							minutes: 59,
						},
					},
					{
						day: 'TUESDAY',
						startTime: {
							hours: 0,
							minutes: 0,
						},
						endTime: {
							hours: 23,
							minutes: 59,
						},
					},
					{
						day: 'WEDNESDAY',
						startTime: {
							hours: 0,
							minutes: 0,
						},
						endTime: {
							hours: 23,
							minutes: 59,
						},
					},
					{
						day: 'THURSDAY',
						startTime: {
							hours: 0,
							minutes: 0,
						},
						endTime: {
							hours: 23,
							minutes: 59,
						},
					},
					{
						day: 'FRIDAY',
						startTime: {
							hours: 0,
							minutes: 0,
						},
						endTime: {
							hours: 23,
							minutes: 59,
						},
					},
					{
						day: 'SATURDAY',
						startTime: {
							hours: 0,
							minutes: 0,
						},
						endTime: {
							hours: 23,
							minutes: 59,
						},
					},
				],
			},
		);
	}

	/**
	 * Creates the queue for handling IVR payments.
	 *
	 * This queue is required so that an agent can transfer a customer to the IVR payment flow using a quick connect.
	 */
	private createQueue(): void {
		console.log('Creating IVR quick connect queue...');
		this.queue = new CfnQueue(this.stack, 'C3IVRQuickConnectQueue', {
			name: 'C3 IVR Quick Connect Queue',
			description: 'Queue for handling IVR quick connect transfers with C3.',
			instanceArn: this.amazonConnectInstanceArn,
			hoursOfOperationArn: this.hoursOfOperation.attrHoursOfOperationArn,
		});
	}

	/**
	 * Creates a quick connect to let agents collect payment.
	 *
	 * This quick connect is required so that an agent can transfer a customer to collect payments through an IVR.
	 */
	private createQuickConnect(): void {
		console.log('Creating quick connect...');
		new CfnQuickConnect(this.stack, 'C3IVRQuickConnect', {
			instanceArn: this.amazonConnectInstanceArn,
			name: 'Payment IVR',
			description: 'Quick connect for collecting IVR payments with C3.',
			quickConnectConfig: {
				quickConnectType: 'QUEUE',
				queueConfig: {
					contactFlowArn: this.ivrPaymentFlow.attrContactFlowArn,
					queueArn: this.queue.attrQueueArn,
				},
			},
		});
	}

	/**
	 * Creates an IAM role allowing C3 to update contact attributes in your Amazon Connect instance.
	 *
	 * This role is required so that the payment request details entered by an agent can be stored in the contact attributes and made
	 * available to the IVR flow. Because 3rd party apps in the agent workspace currently do not support *setting* contact attributes
	 * (only *getting* them), we are required to use a Lambda function within our C3 environment to set them. This role sets up
	 * cross-account permissions for the Lambda function to achieve this.
	 *
	 * If the 3rd party app SDK is updated to support setting contact attributes, this role will no longer be necessary.
	 */
	private createIAMRole(): void {
		console.log('Creating IAM role for agent-assisted IVR...');
		const c3Context = this.stack.node.tryGetContext('c3') as C3Context;
		const c3AWSAccountId =
			c3Context.env === 'prod' ? '426101528791' : '815407490078';
		this.iamRole = new Role(this.stack, 'C3AgentAssistedIVRRole', {
			description:
				'Role that allows C3 to update contact attributes in your Amazon Connect instance.',
			assumedBy: new AccountPrincipal(c3AWSAccountId),
		});
	}

	/**
	 * Creates an IAM policy allowing C3 to update contact attributes for any contact on your instance.
	 *
	 * This policy is required so that the agent workspace can update contact attributes for any contact on your Amazon Connect instance.
	 */
	private createIAMPolicy(): void {
		console.log('Creating IAM policy for agent-assisted IVR...');
		new ManagedPolicy(this.stack, 'C3AgentAssistedIVRPolicy', {
			statements: [
				new PolicyStatement({
					actions: ['connect:UpdateContactAttributes'],
					resources: [`${this.amazonConnectInstanceArn}/contact/*`],
					effect: Effect.ALLOW,
				}),
			],
			roles: [this.iamRole],
		});
	}
}
