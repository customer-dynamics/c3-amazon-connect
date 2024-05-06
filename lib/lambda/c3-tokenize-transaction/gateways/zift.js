import { getSecrets } from '../lib/secrets.js';

const ZIFT_URL =
	process.env.C3_ENV === 'prod'
		? 'https://secure.zift.io/gates/json?'
		: 'https://sandbox-secure.zift.io/gates/json?';

/**
 * Creates a payment token for a credit card.
 *
 * @param {string} cardNumber The credit card number.
 * @param {string} expirationDate The expiration date of the credit card.
 * @returns {Promise<string>} The payment token.
 */
export async function tokenizeCard(cardNumber, expirationDate) {
	console.log('Tokenizing card info...');
	const token = await tokenize(cardNumber, expirationDate);
	console.log('Card successfully tokenized.');
	return token;
}

/**
 * Creates a payment token for a bank account.
 *
 * @param {string} accountNumber The account number of the bank account.
 * @param {string} routingNumber The routing number of the bank account.
 * @returns {Promise<string>} The payment token.
 */
export async function tokenizeBankAccount(accountNumber, routingNumber) {
	console.log('Tokenizing bank account info...');
	const token = await tokenize(accountNumber, routingNumber);
	console.log('Bank account successfully tokenized.');
	return token;
}

/**
 * Tokenizes a credit card or bank account.
 *
 * @param {string} accountNumber The account number. For credit cards, this is the card number. For bank accounts, this is the account number.
 * @param {string} accountAccessory The account accessory. For credit cards, this is the expiration date. For bank accounts, this is the routing number.
 * @returns {Promise<string>} The payment token.
 */
async function tokenize(accountNumber, accountAccessory) {
	const accountSecrets = await getAccountSecrets();

	const requestBody = {
		requestType: 'tokenization',
		userName: accountSecrets.ZIFT_USERNAME,
		password: accountSecrets.ZIFT_PASSWORD,
		accountId: accountSecrets.ZIFT_ACCOUNT_ID,
		accountType: 'R',
		accountNumber,
		accountAccessory,
	};
	const response = await fetch(ZIFT_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(requestBody),
	});
	const body = await response.text();
	const jsonBody = JSON.parse(body);
	console.debug('Response from Zift:', body);

	if (!response.ok) {
		console.error('Error from Zift:', body);
		throw new Error(response.statusText);
	} else if (jsonBody.responseType === 'exception') {
		console.error('Exception from Zift:', jsonBody.responseMessage);
		throw new Error(jsonBody.responseMessage);
	} else if (!jsonBody.token) {
		console.error('No token from Zift:', body);
		throw new Error('No token from Zift');
	}
	return jsonBody.token;
}

/**
 * Gets the Zift account information.
 *
 * @returns {Promise<{ZIFT_ACCOUNT_ID: string, ZIFT_USERNAME: string, ZIFT_PASSWORD: string}>} The Zift account information.
 */
async function getAccountSecrets() {
	console.log('Getting secrets...');
	const secrets = await getSecrets(
		'ZIFT_ACCOUNT_ID',
		'ZIFT_USERNAME',
		'ZIFT_PASSWORD',
	);
	if (
		!secrets.ZIFT_ACCOUNT_ID ||
		secrets.ZIFT_ACCOUNT_ID === '<Your Zift account ID>'
	) {
		throw new Error('Secret for ZIFT_ACCOUNT_ID is not set.');
	}
	if (
		!secrets.ZIFT_USERNAME ||
		secrets.ZIFT_USERNAME === '<Your Zift username>'
	) {
		throw new Error('Secret for ZIFT_USERNAME is not set.');
	}
	if (
		!secrets.ZIFT_PASSWORD ||
		secrets.ZIFT_PASSWORD === '<Your Zift password>'
	) {
		throw new Error('Secret for ZIFT_PASSWORD is not set.');
	}
	return secrets;
}
