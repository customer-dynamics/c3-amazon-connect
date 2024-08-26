import { Stack } from 'aws-cdk-lib';
import {
	CfnContactFlow,
	CfnHoursOfOperation,
	CfnIntegrationAssociation,
	CfnQueue,
	CfnQuickConnect,
} from 'aws-cdk-lib/aws-connect';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { getReceiptFlowContent } from '../connect/content-transformations';
import { AmazonConnectContext, C3Context } from '../models';
import { writeFileToExports } from '../helpers/file';
import { CfnApplication } from 'aws-cdk-lib/aws-appintegrations';

/**
 * Class for creating the necessary resources for the agent-assisted receipt app.
 */
export class ReceiptApp {
	private receiptQueue: CfnQueue;
	private receiptFlow: CfnContactFlow;

	/**
	 * Creates the necessary resources for the agent-assisted receipt app.
	 */
	constructor(
		private stack: Stack,
		private stackLabel: string,
		private amazonConnectContext: AmazonConnectContext,
		private sendReceiptFunction: Function,
		private sendAgentMessageFunction: Function,
		private hoursOfOperation: CfnHoursOfOperation,
		private externalRoleArn: string,
		private c3AppUrlFragment: string,
	) {
		console.log('Creating resources for receipt app...');
		this.createReceiptQueue();
		this.createReceiptFlow();
		this.createReceiptQuickConnect();
		const appUrl = this.getReceiptAppUrl(
			!this.amazonConnectContext.addAppsToWorkspace,
		);
		if (this.amazonConnectContext.addAppsToWorkspace) {
			this.createReceiptApp(appUrl);
		}
	}

	/**
	 * Creates the queue for the receipt quick connect.
	 *
	 * This queue is required so that an agent can send a receipt using a quick connect.
	 */
	private createReceiptQueue(): void {
		console.log('Creating receipt quick connect queue...');
		this.receiptQueue = new CfnQueue(this.stack, 'C3ReceiptQueue', {
			name: 'C3 Receipt Quick Connect Queue',
			description: 'Queue for sending receipts in the C3 agent workspace.',
			instanceArn: this.amazonConnectContext.instanceArn,
			hoursOfOperationArn: this.hoursOfOperation.attrHoursOfOperationArn,
		});
	}

	/**
	 * Creates a Amazon Connect flow for sending receipts.
	 *
	 * This flow is required to send receipts in the agent workspace.
	 */
	private createReceiptFlow(): void {
		console.log('Creating flow C3ReceiptFlow...');
		const receiptFlowContent = getReceiptFlowContent(
			this.sendReceiptFunction,
			this.sendAgentMessageFunction,
		);
		writeFileToExports('C3ReceiptFlow.json', receiptFlowContent);
		this.receiptFlow = new CfnContactFlow(this.stack, 'C3ReceiptFlow', {
			name: 'C3 Receipt',
			description: 'Flow to send payment receipts in the agent workspace.',
			content: receiptFlowContent,
			instanceArn: this.amazonConnectContext.instanceArn,
			type: 'QUEUE_TRANSFER',
		});
	}

	/**
	 * Creates a quick connect to allow agents to send receipts.
	 *
	 * This quick connect is required to send receipts in the agent workspace.
	 */
	private createReceiptQuickConnect(): void {
		console.log('Creating quick connect...');
		new CfnQuickConnect(this.stack, 'C3ReceiptQuickConnect', {
			instanceArn: this.amazonConnectContext.instanceArn,
			name: 'Receipt',
			description:
				'Quick connect for sending receipts in the C3 agent workspace.',
			quickConnectConfig: {
				quickConnectType: 'QUEUE',
				queueConfig: {
					contactFlowArn: this.receiptFlow.attrContactFlowArn,
					queueArn: this.receiptQueue.attrQueueArn,
				},
			},
		});
	}

	/**
	 * Gets the URL to be used for the C3 Receipt app.
	 *
	 * @param customEmbed Whether to use a custom embed URL for the app.
	 * @returns The URL for the app.
	 */
	private getReceiptAppUrl(customEmbed: boolean): string {
		const c3Context = this.stack.node.tryGetContext('c3') as C3Context;
		const instanceId = this.amazonConnectContext.instanceArn.split('/')[1];
		const region = this.amazonConnectContext.instanceArn.split(':')[3];

		// Add parameters to the URL for the specific features.
		let configuredFeatureParams = '';
		if (customEmbed) {
			configuredFeatureParams += '&customEmbed=true';
		}

		const appUrl = `https://${c3Context.vendorId}.${this.c3AppUrlFragment}/agent-workspace/receipt?contactCenter=amazon&instanceId=${instanceId}&region=${region}&externalRoleArn=${this.externalRoleArn}${configuredFeatureParams}`;
		writeFileToExports(
			'C3ReceiptAppUrl.txt',
			`🧾 Your C3 Receipt app URL is:\n\n🌐 ${appUrl}\n`,
		);
		return appUrl;
	}

	/**
	 * Creates a 3rd party application to be used for agent-assisted receipts and associates it with your Amazon Connect instance.
	 *
	 * @param appUrl The URL for the 3rd party application.
	 * This app is required in order for an agent to initiate a receipt while on a call with a customer. Once created, it will show as
	 * an app in the agent workspace. NOTE: You will also have to enable this app to viewed on the security profile for your agents.
	 */
	private createReceiptApp(appUrl: string): void {
		console.log('Creating receipt application...');

		// Create the app.
		const stackLabelTitleCase =
			this.stackLabel.charAt(0).toUpperCase() + this.stackLabel.slice(1);
		const appLabel = this.stackLabel ? ` - ${stackLabelTitleCase}` : '';
		const application = new CfnApplication(
			this.stack,
			`C3ConnectReceiptApp${stackLabelTitleCase}`,
			{
				name: 'Receipt' + appLabel, // App name is unfortunately required to be unique to create.
				namespace: `c3-receipt-${this.stackLabel}`,
				description: 'Agent application for sending receipts with C3.',
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
			this.stack.node.tryGetContext('options').skipAssociations;
		if (skipAssociations) {
			console.log('⚠️ Skipping Amazon Connect associations! ⚠️');
			return;
		}

		// Associate the app with the Amazon Connect instance.
		new CfnIntegrationAssociation(
			this.stack,
			`C3ConnectReceiptIntegrationApp`,
			{
				instanceId: this.amazonConnectContext.instanceArn,
				integrationType: 'APPLICATION',
				integrationArn: application.attrApplicationArn,
			},
		);
	}
}
