import {
	validateCardNumber,
	validateExpirationDate,
} from './card/validation.js';
import { decryptData } from '/opt/nodejs/decryption.js';
import {
	validateAccountNumber,
	validateRoutingNumber,
} from './bank/validation.js';

const validationTypes = {
	/** Validation for a credit or debit card number. */
	CARD_NUMBER: 'CardNumber',

	/** Validation for a credit or debit card expiration date. */
	EXPIRATION_DATE: 'ExpirationDate',

	/** Validation for a bank account number. */
	ACCOUNT_NUMBER: 'AccountNumber',

	/** Validation for a bank routing number. */
	ROUTING_NUMBER: 'RoutingNumber',
};

/**
 * @type {import ('aws-lambda').Handler}
 */
export async function handler(event) {
	console.log(`EVENT: ${JSON.stringify(event)}`);

	try {
		const parameters = event.Details.Parameters;
		const validationType = parameters.ValidationType;
		const customerEntry =
			parameters.CustomerEntry === '#' ? '' : `${parameters.CustomerEntry}`;

		let validationError = null;
		switch (validationType) {
			case validationTypes.CARD_NUMBER:
				const decryptedCardNumber = await decryptData(customerEntry);
				console.log('Validating card number...');
				validationError = validateCardNumber(decryptedCardNumber);
				console.log('Validation error:', validationError);
				break;
			case validationTypes.EXPIRATION_DATE:
				console.log('Validating expiration date...');
				validationError = validateExpirationDate(customerEntry);
				console.log('Validation error:', validationError);
				break;
			case validationTypes.ACCOUNT_NUMBER:
				const decryptedAccountNumber = await decryptData(customerEntry);
				console.log('Validating account number...');
				validationError = validateAccountNumber(decryptedAccountNumber);
				console.log('Validation error:', validationError);
				break;
			case validationTypes.ROUTING_NUMBER:
				console.log('Validating routing number...');
				validationError = validateRoutingNumber(customerEntry);
				console.log('Validation error:', validationError);
				break;
			default:
				throw new Error(`Unknown validation type: ${validationType}`);
		}
		return {
			ValidationError: validationError !== null ? validationError : 'NULL',
		};
	} catch (error) {
		// Catch any errors so we can return 'NULL' to continue the payment process.
		console.error('An unhandled error occurred:', error);
		console.error(
			'Validation is failing. Proceeding with the payment process.',
		);
		return {
			ValidationError: 'NULL',
		};
	}
}
