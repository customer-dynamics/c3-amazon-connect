import luhn from 'fast-luhn';

/**
 * The range of digit lengths for Discover card numbers.
 */
export const DISCOVER_PAN_LENGTH_RANGE = [{ start: 16, end: 19 }];

export const DISCOVER_IIN_RANGES = [
	{ start: '6011', end: '6011' },
	{ start: '622126', end: '622925' },
	{ start: '644', end: '649' },
	{ start: '65', end: '65' },
];

/**
 * A class representing a Discover card.
 */
export class Discover {
	/** The card number. */
	cardNumber = '';

	constructor(cardNumber) {
		this.cardNumber = cardNumber;
	}

	/**
	 * Validates a Discover card number.
	 *
	 * @param {string} cardNumber The card number to validate.
	 * @returns {string | null} An IVR-speakable error message if the card number is invalid, or null if it is valid.
	 */
	validate() {
		if (
			!DISCOVER_PAN_LENGTH_RANGE.some(
				(range) =>
					this.cardNumber.length >= range.start &&
					this.cardNumber.length <= range.end,
			)
		) {
			return 'The card number must be 16 to 19 digits long for Discover.';
		} else if (!luhn(this.cardNumber)) {
			return 'The card number is invalid.';
		}
		return null;
	}

	/**
	 * Determines if a card is issued by Discover.
	 *
	 * @param {string} cardNumber The number of the card.
	 * @returns {boolean} True if the card is Discover, false otherwise.
	 */
	static isDiscover(cardNumber) {
		return DISCOVER_IIN_RANGES.some((range) => {
			const cardNumberPrefix = parseInt(
				cardNumber.substring(0, range.start.toString().length),
			);
			return cardNumberPrefix >= range.start && cardNumberPrefix <= range.end;
		});
	}
}
