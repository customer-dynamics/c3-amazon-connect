import { error } from 'console';
import { tokenizeCard as ziftTokenize } from './gateways/zift.js';

export async function handler(event) {
	console.log(`EVENT: ${JSON.stringify(event)}`);
	const privateKey = await getSecrets(PARAM_PRIVATE_KEY);
	if (!privateKey) {
		return {
			statusCode: 500,
			error: 'Missing Private Key',
		};
	}

	const keyId = await getSecrets(PARAM_KEY_ID);
	if (!keyId) {
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

	const encryptedExp = event.Details.ContactData.Attributes.EncryptedExp;

	let decryptedExp;
	if (encryptedExp && encryptedExp.length > 1) {
		const decryptedDataBytes = await decrypt(
			keyring,
			Buffer.from(encryptedCC, 'base64'),
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
	return response;
}

/**
 *
 * @param  {...string} names
 * @returns Promise<string | null | any>
 */
async function getSecrets(...names) {
	const data = await secretsManager.send(
		new BatchGetSecretValueCommand({
			SecretIdList: names,
		}),
	);
	if (!data.SecretValues) {
		return null;
	}
	if (data.SecretValues?.length === 1) {
		return data.SecretValues[0].SecretString;
	} else {
		return data.SecretValues?.reduce((previousObj, currentObj) => {
			return Object.assign(previousObj, {
				[currentObj.Name]: currentObj.SecretString,
			});
		}, {});
	}
}
