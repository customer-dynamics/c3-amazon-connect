import { SecretValue, Stack } from 'aws-cdk-lib';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';

/**
 * Class for creating the necessary resources to facilitate self-service payments collected through DTMF.
 */
export class Zift {
	/**
	 * Creates the necessary resources to facilitate self-service payments collected through DTMF.
	 */
	constructor(
		private stack: Stack,
		private policyStatement: PolicyStatement,
	) {
		this.createSecrets();
	}

	private createSecrets(): void {
		console.log('Creating Zift secrets...');
		const usernameSecret = new Secret(this.stack, 'c3ZiftUsername', {
			secretName: 'ZIFT_USER_NAME',
			secretStringValue: SecretValue.unsafePlainText('<Username>'),
			description: 'The username for your Zift account used by C3.',
		});

		const passwordSecret = new Secret(this.stack, 'c3ZiftPassword', {
			secretName: 'ZIFT_PASSWORD',
			secretStringValue: SecretValue.unsafePlainText('<Password>'),
			description: 'The password for your Zift account used by C3.',
		});

		const accountIdSecret = new Secret(this.stack, 'c3ZiftAccountId', {
			secretName: 'ZIFT_ACCOUNT_ID',
			secretStringValue: SecretValue.unsafePlainText('<Account ID>'),
			description: 'The account ID for your Zift account used by C3.',
		});
		this.policyStatement.addResources(
			usernameSecret.secretArn,
			passwordSecret.secretArn,
			accountIdSecret.secretArn,
		);
	}
}
