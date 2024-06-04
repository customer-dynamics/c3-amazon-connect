import {
	GetSecretValueCommand,
	SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';

let c3ApiKey = '';

/**
 * @type {import ('aws-lambda').Handler}
 */
export async function handler(event) {
	console.log(`EVENT: ${JSON.stringify(event)}`);

	const contactData = event.Details.ContactData;
	const parameters = event.Details.Parameters;

	if (!parameters.EventText) {
		throw new Error('EventText is required');
	}

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

	// Report the customer activity to the agent.
	const messageResponse = await fetch(
		`${process.env.C3_BASE_URL}/agent-message`,
		{
			method: 'POST',
			headers: {
				'x-api-key': c3ApiKey,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				data: parameters.EventText,
				contactId: contactData.InitialContactId,
			}),
		},
	);
	if (!messageResponse.ok) {
		throw new Error(
			`Failed to send message to agent. Status: ${messageResponse.status}`,
		);
	}

	const responseBody = await messageResponse.json();
	console.log('Message response:', responseBody);
}
