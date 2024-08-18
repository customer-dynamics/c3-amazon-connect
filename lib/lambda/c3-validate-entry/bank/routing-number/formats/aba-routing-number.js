const VALID_LENGTH = 9;

/**
 * Represents an ABA (American Banker's Association) routing number.
 */
export class ABARoutingNumber {
	/** The routing number. */
	routingNumber = '';

	/** The federal reserve routing symbol. */
	federalReserveRoutingSymbol = '';

	/** The institution identifier. */
	institutionIdentifier = '';

	/** The check digit. */
	checkDigit = '';

	/**
	 * Creates a new ABARoutingNumber.
	 *
	 * @param {string} routingNumber The routing number to parse.
	 */
	constructor(routingNumber) {
		this.routingNumber = routingNumber;
		this.federalReserveRoutingSymbol = routingNumber.substring(0, 4);
		this.institutionIdentifier = routingNumber.substring(4, 8);
		this.checkDigit = routingNumber.substring(8);
	}

	/**
	 * Validates a Visa card number.
	 *
	 * @returns {string | null} An IVR-speakable error message if the card number is invalid, or null if it is valid.
	 */
	validate() {
		if (!this.routingNumber) {
			return 'A routing number is required.';
		} else if (this.routingNumber.length !== VALID_LENGTH) {
			return 'The routing number must be nine digits long.';
		}
		return null;
	}

	/**
	 * Performs an ABA (American Banker's Association) checksum on a bank routing number.
	 *
	 * @returns {boolean} True if the routing number satisfies the checksum, false otherwise.
	 */
	#satisfiesChecksum() {
		// Get the checksum digit.
		const checksumDigit = this.routingNumber[8];

		// Get the checksum.
		const weights = [3, 7, 1];
		let sum = 0;

		for (let i = 0; i < this.routingNumber.length; i++) {
			sum += parseInt(this.routingNumber[i]) * weights[i % weights.length];
		}

		const checkSum = (10 - (sum % 10)) % 10;
		console.debug('Checksum:', checkSum);
		return checksumDigit === checkSum;
	}
}
