import { decryptData } from '/opt/nodejs/decryption.js';
import { PaymentGateway } from './gateways/payment-gateway.js';

const REDACTED = 'REDACTED';

/**
 * @type {import ('aws-lambda').Handler}
 */
export async function handler(event) {
	console.log(`EVENT: ${JSON.stringify(event)}`);

	// Get the payment info
	const encryptedCardNumber =
		event.Details.ContactData.Attributes.EncryptedCardNumber;
	let expirationDate = event.Details.ContactData.Attributes.ExpirationDate;
	const encryptedAccountNumber =
		event.Details.ContactData.Attributes.EncryptedAccountNumber;
	const routingNumber = event.Details.ContactData.Attributes.RoutingNumber;

	// Determine payment method
	let paymentMethod;
	if (
		(encryptedCardNumber && encryptedCardNumber !== REDACTED) ||
		(expirationDate && expirationDate !== REDACTED)
	) {
		paymentMethod = 'Card';
	} else if (
		(encryptedAccountNumber && encryptedAccountNumber !== REDACTED) ||
		(routingNumber && routingNumber !== REDACTED)
	) {
		paymentMethod = 'Bank';
	} else {
		console.error(
			'Incomplete payment information found in contact attributes.',
		);
		throw new Error(
			'Incomplete payment information found in contact attributes.',
		);
	}
	console.debug('Payment method:', paymentMethod);

	// Decrypt the card or account number.
	const encryptedData =
		paymentMethod === 'Card' ? encryptedCardNumber : encryptedAccountNumber;
	const decryptedData = await decryptData(encryptedData);

	try {
		// Tokenize the payment information.
		const paymentGateway = new PaymentGateway(process.env.C3_PAYMENT_GATEWAY);
		let paymentToken;
		console.log('Tokenizing payment information...');
		if (paymentMethod === 'Card') {
			paymentToken = await paymentGateway.tokenizeCard(
				decryptedData,
				expirationDate,
			);
		} else {
			paymentToken = await paymentGateway.tokenizeBankAccount(
				decryptedData,
				routingNumber,
			);
		}
		return {
			PaymentToken: paymentToken,
			Error: 'NULL',
		};
	} catch (tokenizeError) {
		// Return the error message to the flow.
		return {
			PaymentToken: 'NULL',
			Error: tokenizeError.message,
		};
	}
}
