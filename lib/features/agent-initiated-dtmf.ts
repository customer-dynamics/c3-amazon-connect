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
import {
	getAgentHoldFlowContent,
	getDTMFPaymentFlowContent,
} from '../connect/content-transformations';
import { AmazonConnectContext } from '../models/amazon-connect-context';

/**
 * Class for creating the necessary resources to facilitate agent-initiated payments collected through DTMF.
 */
export class AgentInitiatedPaymentDTMF {
	private reportCustomerActivityFunction: Function;
	private agentHoldFlow: CfnContactFlow;
	private dtmfPaymentFlow: CfnContactFlow;
	private hoursOfOperation: CfnHoursOfOperation;
	private queue: CfnQueue;
	private iamRole: Role;

	/**
	 * Creates the necessary resources to facilitate agent-initiated payments collected through DTMF.
	 */
	constructor(
		private stack: Stack,
		private amazonConnectInstanceArn: string,
		private amazonConnectContext: AmazonConnectContext,
		private codeSigningConfig: CodeSigningConfig,
		private createPaymentRequestFunction: Function,
		private tokenizeTransactionFunction: Function,
		private submitPaymentFunction: Function,
		private emailReceiptFunction: Function,
	) {
		console.log('Creating resources for agent-initiated DTMF payments...');
		this.createReportCustomerActivityFunction();
		associateLambdaFunctionsWithConnect(this.stack, [
			this.reportCustomerActivityFunction,
		]);
		this.createAgentHoldFlow();
		this.createDTMFFlow();
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
		const c3Env = this.stack.node.tryGetContext('c3') as C3Context;
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
					C3_ENV: c3Env.env,
				},
				codeSigningConfig: this.codeSigningConfig,
			},
		);
	}

	/**
	 * Creates a flow for the agent experience while they are on hold.
	 *
	 * This flow is required to provide the agent with audible updates while they are on hold.
	 */
	private createAgentHoldFlow(): void {
		console.log('Creating flow C3AgentHoldFlow...');
		const c3AgentHoldFlow = getAgentHoldFlowContent();
		if (!existsSync('./exports')) {
			mkdirSync('./exports');
		}
		writeFileSync('./exports/C3AgentHoldFlow', c3AgentHoldFlow);
		this.agentHoldFlow = new CfnContactFlow(this.stack, 'C3AgentHoldFlow', {
			name: 'C3 Agent Hold Flow',
			description:
				'Flow for the agent experience while they are on hold during payment collection.',
			content: c3AgentHoldFlow,
			instanceArn: this.amazonConnectInstanceArn,
			type: 'AGENT_HOLD',
		});
	}

	/**
	 * Creates a flow for agent-initiated DTMF payments.
	 *
	 * This flow is required to collect DTMF payments from customers. It is initiated by the agent and guides the customer through the payment process.
	 */
	private createDTMFFlow(): void {
		console.log('Creating flow C3DTMFPaymentFlow...');
		const c3PaymentFlowContent = getDTMFPaymentFlowContent(
			this.agentHoldFlow,
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
		writeFileSync('./exports/C3DTMFPaymentFlow', c3PaymentFlowContent);
		this.dtmfPaymentFlow = new CfnContactFlow(this.stack, 'C3DTMFPaymentFlow', {
			name: 'C3 DTMF Payment Flow',
			description:
				'Flow module for collecting payments with C3 using DTMF through a quick connect.',
			content: c3PaymentFlowContent,
			instanceArn: this.amazonConnectInstanceArn,
			type: 'QUEUE_TRANSFER',
		});
	}

	/**
	 * Creates hours of operation for handling DTMF payments.
	 *
	 * These hours of operation are required because a queue must have hours of operation defined. This allows the payment queue to be available 24/7.
	 */
	private createHoursOfOperation(): void {
		console.log('Creating hours of operation...');
		this.hoursOfOperation = new CfnHoursOfOperation(
			this.stack,
			'C3DTMFHoursOfOperation',
			{
				instanceArn: this.amazonConnectInstanceArn,
				name: 'C3 DTMF Hours of Operation',
				description:
					'Hours of operation for handling DTMF payment requests with C3.',
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
	 * Creates the queue for handling DTMF payments.
	 *
	 * This queue is required so that an agent can transfer a customer to the DTMF payment flow using a quick connect.
	 */
	private createQueue(): void {
		console.log('Creating DTMF quick connect queue...');
		this.queue = new CfnQueue(this.stack, 'C3DTMFQuickConnectQueue', {
			name: 'C3 DTMF Quick Connect Queue',
			description: 'Queue for handling DTMF quick connect transfers with C3.',
			instanceArn: this.amazonConnectInstanceArn,
			hoursOfOperationArn: this.hoursOfOperation.attrHoursOfOperationArn,
		});
	}

	/**
	 * Creates a quick connect to let agents collect payment.
	 *
	 * This quick connect is required so that an agent can transfer a customer to collect payments using DTMF.
	 */
	private createQuickConnect(): void {
		console.log('Creating quick connect...');
		new CfnQuickConnect(this.stack, 'C3DTMFQuickConnect', {
			instanceArn: this.amazonConnectInstanceArn,
			name: 'C3 Payment',
			description: 'Quick connect for collecting DTMF payments with C3.',
			quickConnectConfig: {
				quickConnectType: 'QUEUE',
				queueConfig: {
					contactFlowArn: this.dtmfPaymentFlow.attrContactFlowArn,
					queueArn: this.queue.attrQueueArn,
				},
			},
		});
	}

	/**
	 * Creates an IAM role allowing C3 to update contact attributes in your Amazon Connect instance.
	 *
	 * This role is required so that the payment request details entered by an agent can be stored in the contact attributes and made
	 * available to the DTMF flow. Because 3rd party apps in the agent workspace currently do not support *setting* contact attributes
	 * (only *getting* them), we are required to use a Lambda function within our C3 environment to set them. This role sets up
	 * cross-account permissions for the Lambda function to achieve this.
	 *
	 * If the 3rd party app SDK is updated to support setting contact attributes, this role will no longer be necessary.
	 */
	private createIAMRole(): void {
		console.log('Creating IAM role for DTMF...');
		this.iamRole = new Role(this.stack, 'C3AgentInitiatedDTMFRole', {
			description:
				'Role that allows C3 to update contact attributes in your Amazon Connect instance.',
			assumedBy: new AccountPrincipal('815407490078'), // TODO: This will have to be dynamically set because prod C3 is a different account.
		});
	}

	/**
	 * Creates an IAM policy allowing C3 to update contact attributes for any contact on your instance.
	 */
	private createIAMPolicy(): void {
		console.log('Creating IAM policy for DTMF...');
		new ManagedPolicy(this.stack, 'C3AgentInitiatedDTMFPolicy', {
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
