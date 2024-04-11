import axios from 'axios';

const BASE_C3_URL = getC3BaseUrl();

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
	await axios.post(
		`${BASE_C3_URL}/email-receipt`,
		{
			transactionId,
			emailAddress,
		},
		{
			headers: {
				'x-api-key': process.env.C3_API_KEY,
			},
		},
	);
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
