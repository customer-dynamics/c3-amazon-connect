import { Stack } from 'aws-cdk-lib';
import { getIVRPaymentFlowModuleContent } from '../connect/content-transformations';
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
		console.log('Creating IVR flow module...');
		const ivrPaymentFlowModuleContent = getIVRPaymentFlowModuleContent(
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
			'./exports/C3IVRPaymentFlowModule',
			ivrPaymentFlowModuleContent,
		);
		new CfnContactFlowModule(this.stack, 'C3IVRPaymentFlowModule', {
			name: 'C3 IVR Payment Flow Module',
			description:
				'Flow module to collect payments through a self-service IVR using C3.',
			content: ivrPaymentFlowModuleContent,
			instanceArn: this.amazonConnectInstanceArn,
		});
	}
}
