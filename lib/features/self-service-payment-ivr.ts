import { Stack } from 'aws-cdk-lib';
import { getPaymentIVRFlowModuleContent } from '../connect/content-transformations';
import { CfnContactFlowModule } from 'aws-cdk-lib/aws-connect';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { AmazonConnectContext } from '../models/amazon-connect-context';
import { Function } from 'aws-cdk-lib/aws-lambda';

/**
 * Class for creating the necessary resources to facilitate self-service payments collected through IVR.
 */
export class SelfServicePaymentIVR {
	/**
	 * Creates the necessary resources to facilitate self-service payments collected through IVR.
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
		console.log('Creating resources for self-service IVR payments...');
		this.createFlowModule();
	}

	/**
	 * Creates a flow module for self-service payments collected through IVR.
	 *
	 * This flow module contains the core process for collecting card information through IVR. It is to be invoked by your
	 * inbound contact flow when the required information is present in contact attributes.
	 */
	private createFlowModule(): void {
		console.log('Creating flow module C3PaymentIVRFlowModule...');
		const paymentIVRFlowModuleContent = getPaymentIVRFlowModuleContent(
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
			'./exports/C3PaymentIVRFlowModule',
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
