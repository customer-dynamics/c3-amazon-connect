import { getSecrets } from './secrets';

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

	const c3BaseUrl = getC3BaseUrl();
	const messageResponse = await fetch(`${c3BaseUrl}/agent-message`, {
		method: 'POST',
		headers: {
			'x-api-key': c3ApiKey,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			data: parameters.EventText,
			contactId: contactData.ContactId,
		}),
	});

	const responseBody = await messageResponse.json();

	console.log('Message response:', responseBody);

	return {
		msg: responseBody,
	};
}

/**
 * Gets the base URL for the C3 API based on the current environment.
 *
 * @returns {string} The base URL for the C3 API.
 */
function getC3BaseUrl() {
	switch (process.env.C3_ENV) {
		case 'prod':
			return 'https://api.call2action.link';
		case 'staging':
			return 'https://mstp8ccw53.execute-api.us-west-2.amazonaws.com/staging';
		case 'dev':
			return 'https://xr1n4f5p34.execute-api.us-west-2.amazonaws.com/dev';
		default:
			throw new Error(`Invalid environment: ${process.env.C3_ENV}`);
	}
}
