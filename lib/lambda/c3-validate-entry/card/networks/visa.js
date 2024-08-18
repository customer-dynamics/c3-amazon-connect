import luhn from 'fast-luhn';

/**
 * The digit lengths for Visa card numbers.
 */
export const VISA_PAN_LENGTHS = [13, 16, 19];

/**
 * The IIN number for Visa card numbers.
 */
const VISA_IIN_NUMBER = '4';

/**
 * A class representing a Visa card.
 */
export class Visa {
	/** The card number. */
	cardNumber = '';

	constructor(cardNumber) {
		this.cardNumber = cardNumber;
	}

	/**
	 * Validates a Visa card number.
	 *
	 * @param {string} cardNumber The card number to validate.
	 * @returns {string | null} An IVR-speakable error message if the card number is invalid, or null if it is valid.
	 */
	validate() {
		if (!VISA_PAN_LENGTHS.includes(this.cardNumber.length)) {
			return 'The card number must be 13, 16, or 19 digits long for Visa.';
		} else if (!luhn(this.cardNumber)) {
			return 'The card number is invalid.';
		}
		return null;
	}

	/**
	 * Determines if a card is issued by Visa.
	 *
	 * @param {string} cardNumber The number of the card.
	 * @returns {boolean} True if the card is Visa, false otherwise.
	 */
	static isVisa(cardNumber) {
		return cardNumber.startsWith(VISA_IIN_NUMBER);
	}
}
