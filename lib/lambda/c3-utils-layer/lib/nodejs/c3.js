import {
	GetSecretValueCommand,
	SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';

let c3ApiKey = '';

/**
 * Gets the C3 API key.
 *
 * @returns {Promise<string>} The C3 API key.
 */
export async function getAPIKey() {
	console.log('Getting C3 API key...');

	// If the API key is already in memory, return it.
	if (c3ApiKey) {
		console.log('Found API key in memory.');
		return c3ApiKey;
	}

	const secretsManagerClient = new SecretsManagerClient();
	const getSecretValueCommand = new GetSecretValueCommand({
		SecretId: process.env.C3_API_KEY_SECRET_ID,
	});
	c3ApiKey = (await secretsManagerClient.send(getSecretValueCommand))
		.SecretString;
	if (!c3ApiKey) {
		throw new Error(
			`No value found for ${process.env.C3_API_KEY_SECRET_ID} secret.`,
		);
	}
	if (c3ApiKey === '<Your C3 API key>') {
		throw new Error(
			`Value for ${process.env.C3_API_KEY_SECRET_ID} secret is not set.`,
		);
	}
	console.log('Retrieved C3 API key from Secrets Manager.');
	return c3ApiKey;
}
