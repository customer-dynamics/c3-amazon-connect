import {
	SecretsManagerClient,
	GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

let c3ApiKey = '';

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

	// Get the API key.
	if (!c3ApiKey) {
		const secretsManagerClient = new SecretsManagerClient();
		const getSecretValueCommand = new GetSecretValueCommand({
			SecretId: process.env.C3_API_KEY_SECRET_ID,
		});
		c3ApiKey = (await secretsManagerClient.send(getSecretValueCommand))
			.SecretString;
		if (!c3ApiKey) {
			throw new Error(
				`No value found for ${process.env.C3_API_KEY_SECRET_ID} secret.`,
			);
		}
		if (c3ApiKey === '<Your C3 API key>') {
			throw new Error(
				`Value for ${process.env.C3_API_KEY_SECRET_ID} secret is not set.`,
			);
		}
	} else {
		console.log('Using API key in memory.');
	}

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

	const response = await postTransaction(
		contactAttributes.PaymentRequestId,
		paymentInfo,
	);
	console.log('Post transaction response:', response);

	return {
		TransactionApproved: response.transactionApproved,
		TransactionId: response.transaction.id,
		TransactionMeta: response.transactionMeta,
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
		throw new Error(
			`Failed to post transaction: ${postTransactionResponse.statusText}`,
		);
	}
	return postTransactionResponse.json();
}
