import { CardNetwork } from './card-network.js';
import { AmericanExpress } from './networks/american-express.js';
import { Discover } from './networks/discover.js';
import { Mastercard } from './networks/mastercard.js';
import { Visa } from './networks/visa.js';

/**
 * Validates a card number.
 *
 * @param {string} cardNumber The card number to validate.
 * @returns {string | null} An IVR-speakable error message if the card number is invalid, or null if it's valid.
 */
export function validateCardNumber(cardNumber) {
	if (!cardNumber) {
		return 'A card number is required.';
	}

	const cardNetwork = getCardNetwork(cardNumber);
	console.log('Card network:', cardNetwork);

	switch (cardNetwork) {
		case CardNetwork.VISA:
			const visa = new Visa(cardNumber);
			return visa.validate();
		case CardNetwork.MASTERCARD:
			const mastercard = new Mastercard(cardNumber);
			return mastercard.validate();
		case CardNetwork.AMERICAN_EXPRESS:
			const americanExpress = new AmericanExpress(cardNumber);
			return americanExpress.validate();
		case CardNetwork.DISCOVER:
			const discover = new Discover(cardNumber);
			return discover.validate();
		default:
			if (cardNumber.length < 13 || cardNumber.length > 19) {
				return 'The card number must be between 13 and 19 digits long.';
			}
			return null; // Unknown card network; assume it's valid.
	}
}

/**
 * Gets the card network for a card number.
 *
 * @param {string} cardNumber The card number.
 * @returns {CardNetwork} The card network.
 */
export function getCardNetwork(cardNumber) {
	if (Visa.isVisa(cardNumber)) {
		return CardNetwork.VISA;
	} else if (Mastercard.isMastercard(cardNumber)) {
		return CardNetwork.MASTERCARD;
	} else if (AmericanExpress.isAmericanExpress(cardNumber)) {
		return CardNetwork.AMERICAN_EXPRESS;
	} else if (Discover.isDiscover(cardNumber)) {
		return CardNetwork.DISCOVER;
	}
	return CardNetwork.UNKNOWN;
}

/**
 * Validates a credit or debit card expiration date.
 *
 * @param {string} expirationDate The expiration date to validate.
 * @returns {string | null} An error message if the expiration date is invalid, or null if it is valid.
 */
export function validateExpirationDate(expirationDate) {
	if (!expirationDate) {
		return 'An expiration date is required.';
	} else if (!/^\d{4}$/.test(expirationDate)) {
		return 'The expiration date must be four digits long.';
	}

	const month = parseInt(expirationDate.substring(0, 2), 10);
	const year = parseInt(expirationDate.substring(2), 10);

	if (month < 1 || month > 12) {
		return 'The expiration month must be between 1 and 12.';
	} else if (
		year + 2000 < new Date().getFullYear() ||
		(year + 2000 === new Date().getFullYear() &&
			month < new Date().getMonth() + 1)
	) {
		return 'The card has expired.';
	}
	return null;
}
