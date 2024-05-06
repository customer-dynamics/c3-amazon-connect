import axios from 'axios';
import { getSecrets } from './secrets.js';

const BASE_C3_URL = getC3BaseUrl();
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
		if (!contactAttributes) {
			throw new Error('Contact attributes not found.');
		}
		if (!contactAttributes.PaymentToken) {
			throw new Error('PaymentToken contact attribute not found.');
		}
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

	// Post the credit transaction.
	try {
		const paymentInfo = {
			name: contactAttributes.ContactName,
			address1: contactAttributes.Address1,
			address2: contactAttributes.Address2,
			city: contactAttributes.City,
			state: contactAttributes.State,
			zipCode: contactAttributes.ZipCode,
			cardAmount: contactAttributes.CardAmount,
			cvv: '', // Not required for Zift.
			expiration: contactAttributes.ExpirationDate,
			token: contactAttributes.PaymentToken,
		};
		const response = await postCreditTransaction(
			contactAttributes.PaymentRequestId,
			paymentInfo,
		);
		console.log('Post credit transaction response:', response);
		return {
			TransactionApproved: response.transactionApproved,
			TransactionId: response.transaction.id,
			TransactionMeta: response.transactionMeta,
		};
	} catch (error) {
		console.error(
			`Failed to post credit transaction for ${contactAttributes.PaymentRequestId}:`,
			error,
		);
		throw error;
	}
}

/**
 * Posts a tokenized credit card transaction to the C3 API.
 *
 * @param {string} paymentRequestId The payment request for the transaction.
 * @param {*} paymentInfo Information about the payment.
 * @returns {*} Information about the transaction.
 */
async function postCreditTransaction(paymentRequestId, paymentInfo) {
	const creditTransactionResponse = await axios.post(
		`${BASE_C3_URL}/post-credit-transaction`,
		{
			paymentRequestId,
			paymentInfo,
		},
		{
			headers: {
				'x-api-key': c3ApiKey,
			},
		},
	);
	return creditTransactionResponse.data;
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
