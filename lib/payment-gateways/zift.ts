import { SecretValue, Stack } from 'aws-cdk-lib';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';

/**
 * Class for creating the necessary resources for tokenizing transactions with Zift.
 */
export class Zift {
	private ziftCredentialsSecret: Secret;

	/**
	 * Creates the necessary resources to facilitate tokenizing transactions with Zift.
	 */
	constructor(
		private stack: Stack,
		private tokenizeTransactionPolicy: PolicyStatement,
		private stackLabel: string,
	) {
		console.log('Creating resources for Zift...');
		this.createZiftCredentialsSecret();
		this.addSecretsToTokenizeTransactionPolicy();
	}

	/**
	 * Creates a secret for the credentials of your Zift account.
	 *
	 * This secret is required to tokenize transactions with Zift.
	 */
	private createZiftCredentialsSecret(): void {
		console.log('Creating Zift credentials secret...');
		const secretLabel = this.stackLabel
			? `_${this.stackLabel.toUpperCase()}`
			: '';
		this.ziftCredentialsSecret = new Secret(this.stack, 'C3ZiftCredentials', {
			secretName: 'ZIFT_CREDENTIALS' + secretLabel,
			secretObjectValue: {
				accountId: SecretValue.unsafePlainText('<Your Zift account ID>'),
				username: SecretValue.unsafePlainText('<Your Zift username>'),
				password: SecretValue.unsafePlainText('<Your Zift password>'),
			},
			description: 'The credentials for your Zift account used by C3.',
		});
	}

	/**
	 * Updates the permissions for the tokenize transaction policy to include getting secret values for Zift credentials.
	 *
	 * This is necessary for the Zift credentials to be retrieved by the tokenize transaction function.
	 */
	private addSecretsToTokenizeTransactionPolicy(): void {
		console.log('Adding Zift secrets to tokenize transaction policy...');
		this.tokenizeTransactionPolicy.addResources(
			this.ziftCredentialsSecret.secretArn,
		);
	}
}
