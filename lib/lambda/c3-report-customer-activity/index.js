import { getSecrets } from './secrets.js';

const C3_API_KEY = 'C3_API_KEY';

let c3ApiKey = '';

/**
 * @type {import ('aws-lambda').Handler}
 */
export async function handler(event) {
	console.log(`EVENT: ${JSON.stringify(event)}`);

	const contactData = event.Details.ContactData;
	const parameters = event.Details.Parameters;

	if (!parameters.EventText) {
		return {
			statusCode: 400,
			body: 'EventText is required',
		};
	}

	// Get the API key.
	const secretValues = await getSecrets(C3_API_KEY);
	c3ApiKey = secretValues[C3_API_KEY];
	if (!c3ApiKey) {
		throw new Error('Missing C3 API key');
	}
	if (c3ApiKey === '<Your C3 API key>') {
		throw new Error('C3 API key not set');
	}

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

	const responseBody = await messageResponse.json();

	console.log('Message response:', responseBody);

	return {
		msg: responseBody,
	};
}
