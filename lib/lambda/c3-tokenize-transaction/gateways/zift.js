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
	try {
		console.log('Tokenizing card info...');
		const response = await tokenize(cardNumber, expirationDate);
		const body = await response.text();
		console.debug('Response from Zift:', body);
		const jsonBody = JSON.parse(body);
		console.log('Card successfully tokenized.');
		return jsonBody.token;
	} catch (error) {
		console.error('Error tokenizing card:', error);
		return {
			error: error.message,
		};
	}
}

/**
 * Creates a payment token for a bank account.
 *
 * @param {string} accountNumber The account number of the bank account.
 * @param {string} routingNumber The routing number of the bank account.
 * @returns {Promise<string>} The payment token.
 */
export async function tokenizeBankAccount(accountNumber, routingNumber) {
	try {
		console.log('Tokenizing bank account info...');
		const response = await tokenize(accountNumber, routingNumber);
		const body = await response.text();
		console.debug('Response from Zift:', body);
		const jsonBody = JSON.parse(body);
		console.log('Bank account successfully tokenized.');
		return jsonBody.token;
	} catch (error) {
		console.error('Error tokenizing bank account:', error);
		return {
			error: error.message,
		};
	}
}

/**
 * Tokenizes a credit card or bank account.
 *
 * @param {string} accountNumber The account number. For credit cards, this is the card number. For bank accounts, this is the account number.
 * @param {string} accountAccessory The account accessory. For credit cards, this is the expiration date. For bank accounts, this is the routing number.
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

	if (!response.ok) {
		console.error('Error from Zift:', await response.text());
		throw new Error(response.statusText);
	}
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
}
