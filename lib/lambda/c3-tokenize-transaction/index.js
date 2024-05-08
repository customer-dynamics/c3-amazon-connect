import {
	buildClient,
	CommitmentPolicy,
	RawRsaKeyringNode,
} from '@aws-crypto/client-node';

import { getSecrets } from './lib/secrets.js';
import { PaymentGateway } from './gateways/payment-gateway.js';

const { decrypt } = buildClient(CommitmentPolicy.FORBID_ENCRYPT_ALLOW_DECRYPT);
const C3_PRIVATE_KEY = 'C3_PRIVATE_KEY';
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
		expirationDate = expirationDate.padStart(4, '0'); // Add any missing leading zeroes to expiration date.
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

	// Get the security key ID.
	console.log('Getting security key ID...');
	const keyId = process.env.CONNECT_SECURITY_KEY_ID;
	if (!keyId) {
		console.error('CONNECT_SECURITY_KEY_ID is not set.');
		throw new Error(
			'CONNECT_SECURITY_KEY_ID is not set. This is the key ID From Amazon Connect.',
		);
	}

	// Get the private key.
	console.log('Getting private key...');
	const secrets = await getSecrets(C3_PRIVATE_KEY);
	const privateKey = secrets[C3_PRIVATE_KEY];
	if (!privateKey || privateKey === '<The content of your private key>') {
		console.error('Secret for C3_PRIVATE_KEY is not set.');
		throw new Error('Secret for C3_PRIVATE_KEY is not set.');
	}
	console.log('Successfully retrieved private key.');

	// Create the keyring.
	console.log('Creating keyring...');
	const keyring = new RawRsaKeyringNode({
		keyName: keyId,
		keyNamespace: 'AmazonConnect', // DO NOT CHANGE
		rsaKey: {
			privateKey,
		},
		oaepHash: 'sha512',
	});

	// Decrypt the card or account number.
	const encryptedData =
		paymentMethod === 'Card' ? encryptedCardNumber : encryptedAccountNumber;
	let decryptedData;
	try {
		console.log('Decrypting data...');
		decryptedData = await decryptData(encryptedData, keyring);
		console.log('Successfully decrypted data.');
	} catch (decryptionError) {
		console.error('Failed to decrypt data:', decryptionError);
		throw new Error('Failed to decrypt data.');
	}

	// Tokenize the payment information.
	const paymentGateway = new PaymentGateway(process.env.C3_PAYMENT_GATEWAY);
	let paymentToken;
	try {
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
	} catch (tokenizationError) {
		console.error('Failed to tokenize payment information:', tokenizationError);
		throw new Error('Failed to tokenize payment information.');
	}

	return {
		PaymentToken: paymentToken,
	};
}

/**
 * Decrypts data.
 *
 * @param {string} encryptedData The encrypted data to decrypt.
 * @param {RawRsaKeyringNode} keyring The keyring to use for decryption.
 * @returns {Promise<string>} The decrypted data. Sensitive!
 */
async function decryptData(encryptedData, keyring) {
	const decryptedDataBytes = await decrypt(
		keyring,
		Buffer.from(encryptedData, 'base64'),
	);
	const decryptedData = decryptedDataBytes.plaintext.toString();
	if (!decryptedData || decryptedData.length < 1) {
		throw new Error('No data found in the encrypted data.');
	}
	return decryptedData;
}
