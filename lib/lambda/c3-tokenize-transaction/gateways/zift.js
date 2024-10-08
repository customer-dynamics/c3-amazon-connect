import {
	GetSecretValueCommand,
	SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import { TokenizeErrors } from '../tokenize-errors.js';

const ZIFT_URL =
	process.env.C3_ENV === 'prod'
		? 'https://secure.zift.io/gates/json?'
		: 'https://sandbox-secure.zift.io/gates/json?';

let ziftCredentials;

/**
 * Class for interacting with the Zift payment gateway.
 */
export class Zift {
	/**
	 * Creates a payment token for a credit card.
	 *
	 * @param {string} cardNumber The credit card number.
	 * @param {string} expirationDate The expiration date of the credit card.
	 * @returns {Promise<string>} The payment token.
	 */
	async tokenizeCard(cardNumber, expirationDate) {
		console.log('Tokenizing card info...');
		const token = await this.#tokenize(cardNumber, expirationDate, 'Card');
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
	async tokenizeBankAccount(accountNumber, routingNumber) {
		console.log('Tokenizing bank account info...');
		const token = await this.#tokenize(accountNumber, routingNumber, 'Bank');
		console.log('Bank account successfully tokenized.');
		return token;
	}

	/**
	 * Tokenizes a credit card or bank account.
	 *
	 * @param {string} accountNumber The account number. For credit cards, this is the card number. For bank accounts, this is the account number.
	 * @param {string} accountAccessory The account accessory. For credit cards, this is the expiration date (not required). For bank accounts, this is the routing number.
	 * @param {'Card' | 'Bank'} paymentMethod The payment method. Either 'Card' or 'Bank'.
	 * @returns {Promise<string>} The payment token.
	 */
	async #tokenize(accountNumber, accountAccessory, paymentMethod) {
		await this.#setZiftCredentials();

		const requestBody = {
			requestType: 'tokenization',
			userName: ziftCredentials.username,
			password: ziftCredentials.password,
			accountId: ziftCredentials.accountId,
			accountType: paymentMethod === 'Card' ? 'R' : 'C',
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
			const normalizedErrorMessage = this.#normalizeErrorMessage(
				jsonBody.responseMessage,
				paymentMethod,
			);
			console.debug('Normalized error message:', normalizedErrorMessage);
			throw new Error(normalizedErrorMessage);
		} else if (!jsonBody.token) {
			console.error('No token from Zift:', body);
			throw new Error('No token from Zift');
		}
		return jsonBody.token;
	}

	/**
	 * Sets the Zift account information.
	 */
	async #setZiftCredentials() {
		if (ziftCredentials) {
			console.log('Using Zift credentials in memory.');
			return;
		}
		const secretsManagerClient = new SecretsManagerClient();
		const getSecretValueCommand = new GetSecretValueCommand({
			SecretId: process.env.ZIFT_CREDENTIALS_SECRET_ID,
		});
		ziftCredentials = JSON.parse(
			(await secretsManagerClient.send(getSecretValueCommand)).SecretString,
		);
		if (!ziftCredentials) {
			throw new Error(
				`No value found for ${process.env.ZIFT_CREDENTIALS_SECRET_ID} secret.`,
			);
		}
		if (
			!ziftCredentials.accountId ||
			ziftCredentials.accountId === '<Your Zift account ID>'
		) {
			throw new Error(
				`Value for accountId in ${process.env.ZIFT_CREDENTIALS_SECRET_ID} secret is not set.`,
			);
		} else if (
			!ziftCredentials.username ||
			ziftCredentials.username === '<Your Zift username>'
		) {
			throw new Error(
				`Value for username in ${process.env.ZIFT_CREDENTIALS_SECRET_ID} secret is not set.`,
			);
		} else if (
			!ziftCredentials.password ||
			ziftCredentials.password === '<Your Zift password>'
		) {
			throw new Error(
				`Value for password in ${process.env.ZIFT_CREDENTIALS_SECRET_ID} secret is not set.`,
			);
		}
	}

	/**
	 * Attempts to map the error message from Zift to a more user-friendly error message.
	 *
	 * @param {string} message The error message from Zift.
	 * @param {'Card' | 'Bank'} paymentMethod The payment method. Either 'Card' or 'Bank'.
	 * @returns
	 */
	#normalizeErrorMessage(message, paymentMethod) {
		switch (message) {
			case 'accountNumber is invalid.':
				return paymentMethod === 'Card'
					? TokenizeErrors.InvalidCardNumber
					: TokenizeErrors.InvalidAccountNumber;
			case 'accountAccessory is not well-formatted.':
				return paymentMethod === 'Card'
					? TokenizeErrors.InvalidExpirationDate
					: TokenizeErrors.InvalidRoutingNumber;
			default:
				// Return the Zift message for any other scenario.
				return `Zift Error: ${message}`;
		}
	}
}
