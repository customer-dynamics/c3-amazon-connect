import {
	buildClient,
	CommitmentPolicy,
	RawRsaKeyringNode,
} from '@aws-crypto/client-node';
import {
	GetSecretValueCommand,
	SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';

const { decrypt } = buildClient(CommitmentPolicy.FORBID_ENCRYPT_ALLOW_DECRYPT);
let c3PrivateKey;

/**
 * Decrypts data.
 *
 * @param {string} encryptedData The encrypted data to decrypt.
 * @returns {Promise<string>} The decrypted data. Sensitive!
 */
export async function decryptData(encryptedData) {
	// If there is no encrypted data, just return an empty string.
	if (!encryptedData) {
		return '';
	}

	// Get the security key ID.
	console.log('Getting security key ID...');
	const keyId = process.env.CONNECT_SECURITY_KEY_ID;
	if (!keyId) {
		console.error('CONNECT_SECURITY_KEY_ID is not set.');
		throw new Error(
			'CONNECT_SECURITY_KEY_ID is not set. This is the key ID From Amazon Connect.',
		);
	}
	console.log('Retrieved security key ID.');

	// Get the private key.
	if (!c3PrivateKey) {
		console.log('Getting private key from Secrets Manager...');
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
		console.log('Retrieved private key from Secrets Manager.');
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
	console.log('Created keyring.');

	// Decrypt the data.
	console.log('Decrypting data...');
	const decryptedDataBytes = await decrypt(
		keyring,
		Buffer.from(encryptedData, 'base64'),
	);
	console.debug('Decrypted data bytes:', decryptedDataBytes);
	const decryptedData = decryptedDataBytes.plaintext.toString();
	if (!decryptedData || decryptedData.length < 1) {
		throw new Error('No data found in the encrypted data.');
	}
	console.log('Successfully decrypted data.');
	return decryptedData;
}
