import {
	buildClient,
	CommitmentPolicy,
	RawRsaKeyringNode,
} from '@aws-crypto/client-node';

import { PaymentGateway } from './gateways/payment-gateway.js';
import {
	GetSecretValueCommand,
	SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';

const REDACTED = 'REDACTED';

const { decrypt } = buildClient(CommitmentPolicy.FORBID_ENCRYPT_ALLOW_DECRYPT);
let c3PrivateKey;

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
	if (!c3PrivateKey) {
		const secretsManagerClient = new SecretsManagerClient();
		const getSecretValueCommand = new GetSecretValueCommand({
			SecretId: process.env.C3_PRIVATE_KEY_SECRET_ID,
		});
		c3PrivateKey = (await secretsManagerClient.send(getSecretValueCommand))
			.SecretString;
		if (!c3PrivateKey) {
			throw new Error(
				`No value found for ${process.env.C3_PRIVATE_KEY_SECRET_ID} secret.`,
			);
		}
		if (c3PrivateKey === '<The content of your private key>') {
			throw new Error(
				`Value for ${process.env.C3_PRIVATE_KEY_SECRET_ID} secret is not set.`,
			);
		}
	} else {
		console.log('Using private key in memory.');
	}

	// Create the keyring.
	console.log('Creating keyring...');
	const keyring = new RawRsaKeyringNode({
		keyName: keyId,
		keyNamespace: 'AmazonConnect',
		rsaKey: {
			privateKey: c3PrivateKey,
		},
		oaepHash: 'sha512',
	});

	// Decrypt the card or account number.
	const encryptedData =
		paymentMethod === 'Card' ? encryptedCardNumber : encryptedAccountNumber;
	console.log('Decrypting data...');
	const decryptedData = await decryptData(encryptedData, keyring);
	console.log('Successfully decrypted data.');

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
