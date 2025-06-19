import { getAPIKey } from '/opt/nodejs/c3.js';

/**
 * @type {import ('aws-lambda').Handler}
 */
export async function handler(event) {
	console.log(`EVENT: ${JSON.stringify(event)}`);

	// Get the contact attributes.
	const contactAttributes = event.Details.ContactData.Attributes;
	const parameters = event.Details.Parameters;
	const sendAll = parameters.SendAll === 'true';
	const emailAddress = contactAttributes.C3ContactEmail;

	// Send all the receipts, if sendAll is true.
	if (sendAll) {
		const transactionIds = JSON.parse(contactAttributes.TransactionIds);
		for (const transactionId of transactionIds) {
			try {
				await sendReceiptEmail(transactionId, emailAddress);
			} catch (error) {
				console.error('Error sending receipt:', error);
			}
		}
		return;
	}

	// Otherwise, send the receipt for the current transaction.
	const transactionId = contactAttributes.TransactionId;
	await sendReceiptEmail(transactionId, emailAddress);
}

/**
 * Emails a receipt for a transaction.
 *
 * @param {string} transactionId The ID of the transaction.
 * @param {string} emailAddress The email address to send the receipt to.
 */
async function sendReceiptEmail(transactionId, emailAddress) {
	// Get the API key.
	const c3ApiKey = await getAPIKey();

	// Email the receipt.
	console.log(
		`Sending email to ${emailAddress} for transaction ${transactionId}...`,
	);
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
	console.log('Email sent successfully.');
}

/**
 * Sends a receipt SMS for a transaction.
 *
 * @param {string} transactionId The ID of the transaction.
 * @param {string} phoneNumber The phone number to send the receipt to.
 */
async function sendReceiptSms(transactionId, phoneNumber) {
	// TODO: Implement this function.
}
