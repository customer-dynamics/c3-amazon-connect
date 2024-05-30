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
import { Code, CodeSigningConfig, Function } from 'aws-cdk-lib/aws-lambda';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

import { C3Context } from '../models/c3-context';
import {
	associateLambdaFunctionsWithConnect,
	commonLambdaProps,
} from '../helpers/lambda';
import { getIVRPaymentFlowContent } from '../connect/content-transformations';
import { AmazonConnectContext } from '../models/amazon-connect-context';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';

/**
 * Class for creating the necessary resources to facilitate agent-assisted payments collected through IVR.
 */
export class AgentAssistedPaymentIVR {
	public iamRole: Role;
	private reportCustomerActivityFunction: Function;
	private ivrPaymentFlow: CfnContactFlow;
	private hoursOfOperation: CfnHoursOfOperation;
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
		private createPaymentRequestFunction: Function,
		private tokenizeTransactionFunction: Function,
		private submitPaymentFunction: Function,
		private emailReceiptFunction: Function,
	) {
		console.log('Creating resources for agent-assisted IVR payments...');
		this.createReportCustomerActivityFunction();
		associateLambdaFunctionsWithConnect(this.stack, [
			this.reportCustomerActivityFunction,
		]);
		this.createIVRFlow();
		this.createHoursOfOperation();
		this.createQueue();
		this.createQuickConnect();
		this.createIAMRole();
		this.createIAMPolicy();
	}

	/**
	 * Creates a Lambda function for reporting payment activity to the agent.
	 *
	 * This function is required to report payment activity to the agent workspace. It is invoked by your payment flow to provide the
	 * agent with visibility into the customer's progress through the payment process.
	 */
	private createReportCustomerActivityFunction(): void {
		console.log('Creating function C3ReportCustomerActivity...');

		// Create function.
		const c3Context = this.stack.node.tryGetContext('c3') as C3Context;
		this.reportCustomerActivityFunction = new Function(
			this.stack,
			'C3ReportCustomerActivity',
			{
				...commonLambdaProps,
				description:
					'Reports customer activity through C3 to the agent workspace.',
				code: Code.fromAsset(
					join(__dirname, '../lambda/c3-report-customer-activity'),
				),
				environment: {
					C3_ENV: c3Context.env,
					C3_BASE_URL: this.c3BaseUrl,
				},
				codeSigningConfig: this.codeSigningConfig,
			},
		);

		// Create the policies for getting secret values.
		const batchGetSecretsPolicy = new PolicyStatement({
			actions: ['secretsmanager:BatchGetSecretValue'],
			resources: ['*'],
		});
		const getSecretValuePolicy = new PolicyStatement({
			actions: ['secretsmanager:GetSecretValue'],
			resources: [this.c3ApiKeySecret.secretArn],
		});
		this.reportCustomerActivityFunction.addToRolePolicy(batchGetSecretsPolicy);
		this.reportCustomerActivityFunction.addToRolePolicy(getSecretValuePolicy);
	}

	/**
	 * Creates a flow for agent-assisted IVR payments.
	 *
	 * This flow is required to collect payments from customers through IVR. It is initiated by the agent and guides the customer through the payment process.
	 */
	private createIVRFlow(): void {
		console.log('Creating flow C3IVRPaymentFlow...');
		const c3PaymentFlowContent = getIVRPaymentFlowContent(
			this.reportCustomerActivityFunction,
			this.createPaymentRequestFunction,
			this.tokenizeTransactionFunction,
			this.submitPaymentFunction,
			this.emailReceiptFunction,
			this.amazonConnectContext.securityKeyId,
			this.amazonConnectContext.securityKeyCertificateContent,
		);
		if (!existsSync('./exports')) {
			mkdirSync('./exports');
		}
		writeFileSync('./exports/C3IVRPaymentFlow', c3PaymentFlowContent);
		this.ivrPaymentFlow = new CfnContactFlow(this.stack, 'C3IVRPaymentFlow', {
			name: 'Agent-Assisted Payment IVR',
			description:
				'Flow for collecting payments with C3 through a quick connect IVR.',
			content: c3PaymentFlowContent,
			instanceArn: this.amazonConnectInstanceArn,
			type: 'QUEUE_TRANSFER',
		});
	}

	/**
	 * Creates hours of operation for handling IVR payments.
	 *
	 * These hours of operation are required because a queue must have hours of operation defined. This allows the payment queue to be available 24/7.
	 */
	private createHoursOfOperation(): void {
		console.log('Creating hours of operation...');
		this.hoursOfOperation = new CfnHoursOfOperation(
			this.stack,
			'C3IVRHoursOfOperation',
			{
				instanceArn: this.amazonConnectInstanceArn,
				name: 'C3 IVR Hours of Operation',
				description:
					'Hours of operation for handling IVR payment requests with C3.',
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
