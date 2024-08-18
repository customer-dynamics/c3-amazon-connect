import luhn from 'fast-luhn';

/**
 * The digit lengths for Mastercard card numbers.
 */
export const MASTERCARD_PAN_LENGTHS = [16];

/**
 * The IIN ranges for Mastercard card numbers.
 */
export const MASTERCARD_IIN_RANGES = [
	{ start: '51', end: '55' },
	{ start: '222100', end: '272099' },
];

/**
 * A class representing a Mastercard card.
 */
export class Mastercard {
	/** The card number. */
	cardNumber = '';

	constructor(cardNumber) {
		this.cardNumber = cardNumber;
	}

	/**
	 * Validates a Mastercard card number.
	 *
	 * @param {string} cardNumber The card number to validate.
	 * @returns {string | null} An IVR-speakable error message if the card number is invalid, or null if it is valid.
	 */
	validate() {
		if (!MASTERCARD_PAN_LENGTHS.includes(this.cardNumber.length)) {
			return 'The card number must be 16 digits long for Mastercard.';
		} else if (!luhn(this.cardNumber)) {
			return 'The card number is invalid.';
		}
		return null;
	}

	/**
	 * Determines if a card is issued by Mastercard.
	 *
	 * @param {string} cardNumber The number of the card.
	 * @returns {boolean} True if the card is Mastercard, false otherwise.
	 */
	static isMastercard(cardNumber) {
		return MASTERCARD_IIN_RANGES.some((range) => {
			const cardNumberPrefix = parseInt(
				cardNumber.substring(0, range.start.toString().length),
			);
			return cardNumberPrefix >= range.start && cardNumberPrefix <= range.end;
		});
	}
}
