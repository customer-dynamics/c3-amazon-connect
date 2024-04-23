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
	const keyValues = await getSecrets(C3_PRIVATE_KEY);
	const privateKey = keyValues[C3_PRIVATE_KEY];
	if (!privateKey) {
		return {
			statusCode: 500,
			error: 'Missing Private Key',
		};
	}
	console.log('Retrieved Secrets');

	const keyId = process.env.CONNECT_KEY_ID; // This is the KeyID From Amazon Connect
	if (!keyId) {
		console.error('Missing KeyId');
		return {
			statusCode: 500,
			error: 'Missing keyId.  This is the KeyID From Amazon Connect',
		};
	}

	const keyNamespace = 'AmazonConnect'; // DO NOT CHANGE

	const rsaKey = {
		privateKey: privateKey,
	};
	const keyring = new RawRsaKeyringNode({
		keyName: keyId,
		keyNamespace: keyNamespace,
		rsaKey: rsaKey,
		oaepHash: 'sha512',
	});

	const encryptedCC = event.Details.ContactData.Attributes.EncryptedCreditCard;
	let decryptedCC;
	if (encryptedCC && encryptedCC.length > 1) {
		const decryptedDataBytes = await decrypt(
			keyring,
			Buffer.from(encryptedCC, 'base64'),
		);
		decryptedCC = decryptedDataBytes.plaintext.toString();
		//don't log the sensitive data
	} else {
		console.log('No CC!');
		decryptedCC = '';
		return {
			error: 'No card number was provided',
		};
	}

	const encryptedExp =
		event.Details.ContactData.Attributes.EncryptedExpirationDate;

	let decryptedExp;
	if (encryptedExp && encryptedExp.length > 1) {
		const decryptedDataBytes = await decrypt(
			keyring,
			Buffer.from(encryptedExp, 'base64'),
		);
		decryptedExp = decryptedDataBytes.plaintext.toString();
	} else {
		console.log('No Exp!');
		return {
			error: 'No expiration was provided',
		};
	}
	let tokenizedCard;
	if (
		decryptedCC &&
		decryptedCC.length > 1 &&
		decryptedExp &&
		decryptedExp.length > 1
	) {
		if (process.env.C3_PAYMENT_GATEWAY === 'Zift') {
			tokenizedCard = await ziftTokenize(decryptedCC, decryptedExp);
			if (tokenizedCard.error) {
				return {
					error: tokenizedCard.error,
				};
			}
			console.log('Tokenized Card: ' + tokenizedCard);
		} else {
			return {
				error: 'No supported gateway was defined to tokenize the card.',
			};
		}
	}

	const response = {
		cardToken: tokenizedCard,
		exp: decryptedExp,
	};
	console.log('Returning', response);
	return response;
}
