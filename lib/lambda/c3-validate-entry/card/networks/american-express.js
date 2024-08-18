import luhn from 'fast-luhn';

/**
 * The digit length for American Express card numbers.
 */
export const AMEX_PAN_LENGTH = 15;

/**
 * The IIN numbers for American Express card numbers.
 */
export const AMEX_IIN_NUMBERS = ['34', '37'];

/**
 * A class representing an American Express card.
 */
export class AmericanExpress {
	/** The card number. */
	cardNumber = '';

	constructor(cardNumber) {
		this.cardNumber = cardNumber;
	}

	/**
	 * Validates an American Express card number.
	 *
	 * @param {string} cardNumber The card number to validate.
	 * @returns {string | null} An IVR-speakable error message if the card number is invalid, or null if it is valid.
	 */
	validate() {
		if (this.cardNumber.length !== AMEX_PAN_LENGTH) {
			return 'The card number must be 15 digits long for American Express.';
		} else if (!luhn(this.cardNumber)) {
			return 'The card number is invalid.';
		}
		return null;
	}

	/**
	 * Determines if a card is issued by American Express.
	 *
	 * @param {string} cardNumber The number of the card.
	 * @returns {boolean} True if the card is American Express, false otherwise.
	 */
	static isAmericanExpress(cardNumber) {
		return AMEX_IIN_NUMBERS.some((iin) => {
			return cardNumber.startsWith(iin);
		});
	}
}
