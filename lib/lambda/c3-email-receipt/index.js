import {
	SecretsManagerClient,
	GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

let c3ApiKey = '';

/**
 * @type {import ('aws-lambda').Handler}
 */
export async function handler(event) {
	console.log(`EVENT: ${JSON.stringify(event)}`);

	// Get the contact attributes.
	let contactAttributes = {};
	contactAttributes = event.Details.ContactData.Attributes;

	// Get the API key.
	if (!c3ApiKey) {
		const secretsManagerClient = new SecretsManagerClient();
		const getSecretValueCommand = new GetSecretValueCommand({
			SecretId: 'C3_API_KEY',
		});
		c3ApiKey = (await secretsManagerClient.send(getSecretValueCommand))
			.SecretString;
		if (!c3ApiKey) {
			throw new Error('No value found for C3_API_KEY secret.');
		}
		if (c3ApiKey === '<Your C3 API key>') {
			throw new Error('Value for C3_API_KEY secret is not set.');
		}
	} else {
		console.log('Using API key in memory.');
	}

	// Email the receipt
	const transactionId = contactAttributes.TransactionId;
	const emailAddress = contactAttributes.Email;
	await emailReceipt(transactionId, emailAddress);
}

/**
 * Emails a receipt for a transaction.
 *
 * @param {string} transactionId The ID of the transaction.
 * @param {string} emailAddress The email address to send the receipt to.
 */
async function emailReceipt(transactionId, emailAddress) {
	const response = await fetch(`${process.env.C3_BASE_URL}/email-receipt`, {
		method: 'POST',
		headers: {
			'x-api-key': c3ApiKey,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			transactionId,
			emailAddress,
		}),
	});
	if (!response.ok) {
		throw new Error(`Failed to email receipt: ${response.statusText}`);
	}
}
