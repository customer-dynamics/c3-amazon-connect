import { ABARoutingNumber } from './routing-number/formats/aba-routing-number.js';

/**
 * Validates a bank account number.
 *
 * There is currently no standard format for US bank account numbers, so this function only checks if the account number is present.
 *
 * @param {string} accountNumber The bank account number to validate.
 * @returns {string | null} An IVR-speakable error message if the bank account number is invalid, or null if it's valid.
 */
export function validateAccountNumber(accountNumber) {
	if (!accountNumber) {
		return 'Account number is required.';
	}
	return null;
}

/**
 * Validates a bank routing number.
 *
 * @param {string} routingNumber The bank routing number to validate.
 * @returns {string | null} An IVR-speakable error message if the bank routing number is invalid, or null if it's valid.
 */
export function validateRoutingNumber(routingNumber) {
	const abaRoutingNumber = new ABARoutingNumber(routingNumber);
	return abaRoutingNumber.validate();
}
