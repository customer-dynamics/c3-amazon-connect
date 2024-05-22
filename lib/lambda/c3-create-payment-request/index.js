import {
	SecretsManagerClient,
	GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

const BASE_C3_URL = getC3BaseUrl();

let c3ApiKey = '';

/**
 * @type {import ('aws-lambda').Handler}
 */
export async function handler(event) {
	console.log(`EVENT: ${JSON.stringify(event)}`);

	// Get the contact attributes.
	let contactAttributes = {};
	try {
		contactAttributes = event.Details.ContactData.Attributes;
	} catch (error) {
		console.error('Failed to get contact attributes:', error);
		throw error;
	}

	// Get the API key.
	if (!c3ApiKey) {
		const secretsManagerClient = new SecretsManagerClient();
		const getSecretValueCommand = new GetSecretValueCommand({
			SecretId: 'C3_API_KEY',
		});
		c3ApiKey = await secretsManagerClient.send(getSecretValueCommand);
		if (!c3ApiKey) {
			throw new Error('No value found for C3_API_KEY secret.');
		}
		if (c3ApiKey === '<Your C3 API key>') {
			throw new Error('Value for C3_API_KEY secret is not set.');
		}
	} else {
		console.log('Using API key in memory.');
	}

	// Create the payment request.
	try {
		const paymentRequestBody = {
			// Environment
			vendorId: process.env.C3_VENDOR_ID,
			logoUrl: process.env.LOGO_URL,
			supportPhone: process.env.SUPPORT_PHONE,
			supportEmail: process.env.SUPPORT_EMAIL,
			ttl: 60,

			// Contact
			subjectId: contactAttributes.SubjectId,
			agentId: contactAttributes.AgentId || 'automated-ivr-agent',
			contactName: contactAttributes.ContactName,
			c2a: {
				payment: {
					amountDue: contactAttributes.PaymentAmountDue,
					agingInfo: contactAttributes.PaymentAgingInfo,
					minimumPayment: contactAttributes.PaymentMinimumPayment,
				},
			},
		};

		const paymentRequestResponse = await fetch(`${BASE_C3_URL}/payment-request`, {
			method: 'POST',
			headers: {
				'x-api-key': c3ApiKey,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(paymentRequestBody),
		});
		const paymentRequestResponseJson = await paymentRequestResponse.json();
		console.log('Payment request response:', paymentRequestResponseJson);
		return {
			PaymentRequestId: paymentRequestResponseJson.id,
		};
	} catch (error) {
		console.error(error);
		throw error;
	}
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
