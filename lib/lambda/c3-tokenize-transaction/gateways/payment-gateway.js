import { Zift } from './zift.js';

/**
 * Payment gateway for tokenizing payment methods.
 */
export class PaymentGateway {
	#paymentGateway;

	constructor(paymentGatewayName) {
		console.log(`Using payment gateway: ${paymentGatewayName}.`);
		switch (paymentGatewayName) {
			case 'Zift':
				this.#paymentGateway = new Zift();
				break;
			default:
				throw new Error(
					`Invalid payment gateway specified: ${this.#paymentGateway}`,
				);
		}
	}

	/**
	 * Creates a payment token for a credit card.
	 *
	 * @param {string} cardNumber The credit card number.
	 * @param {string} expirationDate The expiration date of the credit card.
	 * @returns {Promise<string>} The payment token.
	 */
	async tokenizeCard(cardNumber, expirationDate) {
		return this.#paymentGateway.tokenizeCard(cardNumber, expirationDate);
	}

	/**
	 * Creates a payment token for a bank account.
	 *
	 * @param {string} accountNumber The account number of the bank account.
	 * @param {string} routingNumber The routing number of the bank account.
	 * @returns {Promise<string>} The payment token.
	 */
	async tokenizeBankAccount(accountNumber, routingNumber) {
		return this.#paymentGateway.tokenizeBankAccount(
			accountNumber,
			routingNumber,
		);
	}
}
