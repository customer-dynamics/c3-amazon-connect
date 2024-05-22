import { getSecrets } from './secrets.js';

const C3_API_KEY = 'C3_API_KEY';

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
	const secretValues = await getSecrets(C3_API_KEY);
	c3ApiKey = secretValues[C3_API_KEY];
	if (!c3ApiKey) {
		throw new Error('Missing C3 API key');
	}
	if (c3ApiKey === '<Your C3 API key>') {
		throw new Error('C3 API key not set');
	}

	// Email the receipt
	const transactionId = contactAttributes.TransactionId;
	const emailAddress = contactAttributes.Email;
	try {
		await emailReceipt(transactionId, emailAddress);
	} catch (error) {
		console.error(
			`Failed to email receipt for transaction ${transactionId}:`,
			error,
		);
		throw error;
	}
}

/**
 * Emails a receipt for a transaction.
 *
 * @param {string} transactionId The ID of the transaction.
 * @param {string} emailAddress The email address to send the receipt to.
 */
async function emailReceipt(transactionId, emailAddress) {
	await fetch(`${process.env.C3_BASE_URL}/email-receipt`, {
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
}
