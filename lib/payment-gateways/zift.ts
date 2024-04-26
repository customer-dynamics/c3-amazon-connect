import { SecretValue, Stack } from 'aws-cdk-lib';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';

/**
 * Class for creating the necessary resources for tokenizing transactions with Zift.
 */
export class Zift {
	private usernameSecret: Secret;
	private passwordSecret: Secret;
	private accountIdSecret: Secret;

	/**
	 * Creates the necessary resources to facilitate tokenizing transactions with Zift.
	 */
	constructor(
		private stack: Stack,
		private tokenizeTransactionPolicy: PolicyStatement,
	) {
		console.log('Creating resources for Zift...');
		this.createUsernameSecret();
		this.createPasswordSecret();
		this.createAccountIdSecret();
		this.addSecretsToTokenizeTransactionPolicy();
	}

	/**
	 * Creates a secret for the username of your Zift account.
	 *
	 * This secret is required to tokenize transactions with Zift.
	 */
	private createUsernameSecret(): void {
		console.log('Creating Zift username secret...');
		this.usernameSecret = new Secret(this.stack, 'C3ZiftUsername', {
			secretName: 'ZIFT_USERNAME',
			secretStringValue: SecretValue.unsafePlainText('<Your Zift username>'),
			description: 'The username for your Zift account used by C3.',
		});
	}

	/**
	 * Creates a secret for password for your Zift account.
	 *
	 * This secret is required to tokenize transactions with Zift.
	 */
	private createPasswordSecret(): void {
		console.log('Creating Zift password secret...');
		this.passwordSecret = new Secret(this.stack, 'C3ZiftPassword', {
			secretName: 'ZIFT_PASSWORD',
			secretStringValue: SecretValue.unsafePlainText('<Your Zift password>'),
			description: 'The password for your Zift account used by C3.',
		});
	}

	/**
	 * Creates a secret for the account ID of your Zift account.
	 *
	 * This secret is required to tokenize transactions with Zift.
	 */
	private createAccountIdSecret(): void {
		console.log('Creating Zift account ID secret...');
		this.accountIdSecret = new Secret(this.stack, 'C3ZiftAccountId', {
			secretName: 'ZIFT_ACCOUNT_ID',
			secretStringValue: SecretValue.unsafePlainText('<Your Zift account ID>'),
			description: 'The account ID for your Zift account used by C3.',
		});
	}

	/**
	 * Updates the permissions for the tokenize transaction policy to include getting secret values for Zift secrets.
	 *
	 * This is necessary for the Zift secret values to be retrieved by the tokenize transaction function.
	 */
	private addSecretsToTokenizeTransactionPolicy(): void {
		console.log('Adding Zift secrets to tokenize transaction policy...');
		this.tokenizeTransactionPolicy.addResources(
			this.usernameSecret.secretArn,
			this.passwordSecret.secretArn,
			this.accountIdSecret.secretArn,
		);
	}
}

export const ZIFT_URL = 'https://secure.zift.io/gates/json?';
