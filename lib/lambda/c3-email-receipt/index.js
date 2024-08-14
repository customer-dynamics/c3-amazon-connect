import { getAPIKey } from '/opt/nodejs/c3.js';

/**
 * @type {import ('aws-lambda').Handler}
 */
export async function handler(event) {
	console.log(`EVENT: ${JSON.stringify(event)}`);

	// Get the contact attributes.
	let contactAttributes = {};
	contactAttributes = event.Details.ContactData.Attributes;

	// Email the receipt.
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
	// Get the API key.
	const c3ApiKey = await getAPIKey();

	// Email the receipt.
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
