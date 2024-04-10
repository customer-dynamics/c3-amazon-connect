import axios from 'axios';

const BASE_C3_URL = getC3BaseUrl();

/**
 * @type {import ('aws-lambda').Handler}
 */
export async function handler(event) {
	console.log(`EVENT: ${JSON.stringify(event)}`);

	// Get the parameters.
	let parameters = {};
	try {
		parameters = event.Details.Parameters;
		if (!parameters) {
			throw new Error('Parameters not found.');
		}
		if (!parameters.CardToken) {
			throw new Error('CardToken parameter not found.');
		}
		if (!parameters.ExpirationDate) {
			throw new Error('ExpirationDate parameter not found.');
		}
	} catch (error) {
		console.error('Failed to get parameters:', error);
		throw error;
	}

	// Get the contact attributes.
	let contactAttributes = {};
	try {
		contactAttributes = event.Details.ContactData.Attributes;
	} catch (error) {
		console.error('Failed to get contact attributes:', error);
		throw error;
	}

	// Get the payment request.
	let paymentRequest = {};
	try {
		paymentRequest = await getPaymentRequest(
			contactAttributes.PaymentRequestId,
		);
		console.log('Payment request response:', paymentRequest);
	} catch (error) {
		console.error(
			`Failed to get payment request for ${contactAttributes.PaymentRequestId}:`,
			error,
		);
		throw error;
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
			expiration: parameters.ExpirationDate,
			token: parameters.CardToken,
		};
		const response = await postCreditTransaction(paymentRequest, paymentInfo);
		console.log('Post credit transaction response:', response);
		return {
			TransactionApproved: response.transactionApproved,
			TransactionId: response.transaction,
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
 * Gets a payment request from the C3 API.
 *
 * @param {string} paymentRequestId The ID of the payment request to get.
 * @returns {*} The payment request.
 */
async function getPaymentRequest(paymentRequestId) {
	const paymentRequestResponse = await axios.get(
		`${BASE_C3_URL}/payment-request/${paymentRequestId}`,
		{
			headers: {
				'x-api-key': process.env.C3_API_KEY,
			},
		},
	);
	return paymentRequestResponse.data;
}

/**
 * Posts a tokenized credit card transaction to the C3 API.
 *
 * @param {*} paymentRequest The payment request for the transaction.
 * @param {*} paymentInfo Information about the payment.
 * @returns {*} Information about the transaction.
 */
async function postCreditTransaction(paymentRequest, paymentInfo) {
	const creditTransactionResponse = await axios.post(
		`${BASE_C3_URL}/post-credit-transaction`,
		{
			paymentRequest,
			paymentInfo,
		},
		{
			headers: {
				'x-api-key': process.env.C3_API_KEY,
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
