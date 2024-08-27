import { getAPIKey } from '/opt/nodejs/c3.js';
import { stripTagsFromText } from '/opt/nodejs/formatting.js';

/**
 * @type {import ('aws-lambda').Handler}
 */
export async function handler(event) {
	console.log(`EVENT: ${JSON.stringify(event)}`);

	// Get the contact attributes.
	let contactAttributes = {};
	contactAttributes = event.Details.ContactData.Attributes;
	if (!contactAttributes) {
		throw new Error('Contact attributes not found.');
	}
	if (!contactAttributes.PaymentToken) {
		throw new Error('PaymentToken contact attribute not found.');
	}
	if (!contactAttributes.PaymentMethod) {
		throw new Error('PaymentMethod contact attribute not found.');
	}
	const paymentMethod = contactAttributes.PaymentMethod;

	let response;
	try {
		// Post the transaction.
		let paymentInfo = {
			name: contactAttributes.ContactName,
			paymentAmount: +contactAttributes.PaymentAmount,
			token: contactAttributes.PaymentToken,

			// Passing these if they exist, but they are not required.
			address1: contactAttributes.Address1,
			address2: contactAttributes.Address2,
			city: contactAttributes.City,
			state: contactAttributes.State,
			zipCode: contactAttributes.ZipCode,
		};
		if (paymentMethod === 'Card') {
			const creditCardPaymentInfo = {
				expiration: '', // Expiration date is not required for Zift.
			};
			paymentInfo = { ...paymentInfo, ...creditCardPaymentInfo };
		} else if (paymentMethod === 'Bank') {
			const bankAccountPaymentInfo = {
				routingNumber: contactAttributes.RoutingNumber,
			};
			paymentInfo = { ...paymentInfo, ...bankAccountPaymentInfo };
		}

		response = await postTransaction(
			contactAttributes.PaymentRequestId,
			paymentInfo,
		);
	} catch (error) {
		// Only return Zift errors to the contact flow.
		if (error.message.includes('Zift Error:')) {
			return {
				Error: stripTagsFromText(error.message),
			};
		}
		throw error;
	}

	// Get the last 4 digits of the card number or the bank account number.
	const maskedNumber =
		paymentMethod === 'Card'
			? response.transaction.cardNumber
			: response.transaction.bankAccountNumber;
	const endingDigits = maskedNumber.slice(-4);

	// Update the list of all transaction IDs.
	const previousTransactionIds = contactAttributes.TransactionIds
		? JSON.parse(contactAttributes.TransactionIds)
		: [];
	console.debug('previousTransactionIds:', previousTransactionIds);
	const newTransactionIds = [
		...previousTransactionIds,
		response.transaction.id,
	];
	console.debug('newTransactionIds:', newTransactionIds);

	return {
		TransactionApproved: response.transactionApproved,
		TransactionId: response.transaction.id,
		TransactionIds: JSON.stringify(newTransactionIds),
		TransactionMeta: response.transactionMeta,
		PaymentMethodEndingDigits: endingDigits,
		Error: 'NULL',
	};
}

/**
 * Posts a tokenized payment to the C3 API.
 *
 * @param {string} paymentRequestId The payment request for the transaction.
 * @param {*} paymentInfo Information about the payment.
 * @returns {*} Information about the transaction.
 */
async function postTransaction(paymentRequestId, paymentInfo) {
	// Get the API key.
	const c3ApiKey = await getAPIKey();

	// Post the transaction.
	const postTransactionResponse = await fetch(
		`${process.env.C3_BASE_URL}/post-credit-transaction`,
		{
			method: 'POST',
			headers: {
				'x-api-key': c3ApiKey,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				paymentRequestId,
				paymentInfo,
			}),
		},
	);
	if (!postTransactionResponse.ok) {
		const response = await postTransactionResponse.json();
		console.log('Post transaction response:', response);
		const metaInfo = JSON.parse(response.transactionMeta.metaInfo);
		throw new Error(
			`Zift Error: ${metaInfo.responseMessage ?? 'An unknown error occurred.'}`,
		);
	}
	return postTransactionResponse.json();
}
