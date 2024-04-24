import { Stack } from 'aws-cdk-lib';
import { getDTMFPaymentFlowModuleContent } from '../connect/content-transformations';
import { CfnContactFlowModule } from 'aws-cdk-lib/aws-connect';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { AmazonConnectContext } from '../models/amazon-connect-context';
import { Function } from 'aws-cdk-lib/aws-lambda';

/**
 * Class for creating the necessary resources to facilitate self-service payments collected through DTMF.
 */
export class SelfServicePaymentDTMF {
	/**
	 * Creates the necessary resources to facilitate self-service payments collected through DTMF.
	 */
	constructor(
		private stack: Stack,
		private amazonConnectInstanceArn: string,
		private amazonConnectContext: AmazonConnectContext,
		private createPaymentRequestFunction: Function,
		private tokenizeTransactionFunction: Function,
		private submitPaymentFunction: Function,
		private emailReceiptFunction: Function,
	) {
		console.log('Creating resources for self-service DTMF payments...');
		this.createFlowModule();
	}

	/**
	 * Creates a flow module for self-service payments collected through DTMF.
	 *
	 * This flow module contains the core process for collecting card information through DTMF. It is to be invoked by your
	 * inbound contact flow when the required information is present in contact attributes.
	 */
	private createFlowModule(): void {
		console.log('Creating DTMF flow module...');
		const dtmfPaymentFlowModuleContent = getDTMFPaymentFlowModuleContent(
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
		writeFileSync(
			'./exports/C3DTMFPaymentFlowModule',
			dtmfPaymentFlowModuleContent,
		);
		new CfnContactFlowModule(this.stack, 'C3DTMFPaymentFlowModule', {
			name: 'C3 DTMF Payment Flow Module',
			description:
				'Flow module for collecting payments with C3 using DTMF in an inbound queue.',
			content: dtmfPaymentFlowModuleContent,
			instanceArn: this.amazonConnectInstanceArn,
		});
	}
}
