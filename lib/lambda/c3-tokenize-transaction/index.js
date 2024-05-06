import {
	buildClient,
	CommitmentPolicy,
	RawRsaKeyringNode,
} from '@aws-crypto/client-node';

import { tokenizeCard as ziftTokenize } from './gateways/zift.js';
import { getSecrets } from './lib/secrets.js';

const { decrypt } = buildClient(CommitmentPolicy.FORBID_ENCRYPT_ALLOW_DECRYPT);
const C3_PRIVATE_KEY = 'C3_PRIVATE_KEY';

/**
 * @type {import ('aws-lambda').Handler}
 */
export async function handler(event) {
	console.log(`EVENT: ${JSON.stringify(event)}`);

	// Get the security key ID.
	console.log('Getting security key ID...');
	const keyId = process.env.CONNECT_SECURITY_KEY_ID;
	if (!keyId) {
		console.error('CONNECT_SECURITY_KEY_ID is not set.');
		throw new Error(
			'CONNECT_SECURITY_KEY_ID is not set. This is the key ID From Amazon Connect.',
		);
	}

	// Get the encrypted credit card.
	console.log('Getting encrypted card number...');
	const encryptedCardNumber =
		event.Details.ContactData.Attributes.EncryptedCardNumber;
	if (!encryptedCardNumber || encryptedCardNumber.length < 1) {
		console.error('EncryptedCardNumber was not found in contact attributes.');
		throw new Error('EncryptedCardNumber was not found in contact attributes.');
	}

	// Get the expiration date.
	console.log('Getting expiration date...');
	const expirationDate =
		event.Details.ContactData.Attributes.ExpirationDate;
	if (!expirationDate || expirationDate.length < 1) {
		console.error(
			'ExpirationDate was not found in contact attributes.',
		);
		throw new Error(
			'ExpirationDate was not found in contact attributes.',
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

	// Decrypt the credit card number.
	let decryptedCardNumber;
	try {
		console.log('Decrypting credit card number...');
		decryptedCardNumber = await decryptData(encryptedCardNumber, keyring);
		console.log('Successfully decrypted credit card number.');
	} catch (cardDecryptionError) {
		console.error('Failed to decrypt credit card number:', cardDecryptionError);
		throw new Error('Failed to decrypt credit card number.');
	}

	// Tokenize the card information.
	console.log('Tokenizing card information...');
	let paymentToken;
	switch (process.env.C3_PAYMENT_GATEWAY) {
		case 'Zift':
			paymentToken = await ziftTokenize(decryptedCardNumber, expirationDate);
			break;
		default:
			throw new Error(
				`Unable to tokenize payment for unknown gateway: ${process.env.C3_PAYMENT_GATEWAY}`,
			);
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
