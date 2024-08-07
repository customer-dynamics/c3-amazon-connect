export interface AmazonConnectContext {
	instanceArn: string;
	securityKeyId: string;
	securityKeyCertificateContent: string;
	workspaceApp: boolean;
}

/**
 * Validates the Amazon Connect context variables. Throws an error if any of the required variables are missing.
 *
 * @param amazonConnectContext The Amazon Connect context variables.
 */
export function validateAmazonConnectContext(
	amazonConnectContext: AmazonConnectContext,
): void {
	if (!amazonConnectContext) {
		throw new Error('amazonConnect context variables are required.');
	} else if (!amazonConnectContext.instanceArn) {
		throw new Error('amazonConnect.instanceArn context variable is required.');
	} else if (!amazonConnectContext.securityKeyId) {
		throw new Error(
			'amazonConnect.securityKeyId context variable is required.',
		);
	} else if (!amazonConnectContext.securityKeyCertificateContent) {
		throw new Error(
			'amazonConnect.securityKeyCertificateContent context variable is required.',
		);
	} else if (
		amazonConnectContext.securityKeyCertificateContent.includes('\n')
	) {
		throw new Error(
			'Newline characters (\\n) must be escaped in amazonConnect.securityKeyCertificateContent context variable.',
		);
	} else if (
		!amazonConnectContext.securityKeyCertificateContent.includes('\\n')
	) {
		throw new Error(
			'amazonConnect.securityKeyCertificateContent context variable must be a multi-line string.',
		);
	}
}
