import { C3Environment } from './enums/c3-environment';
import { C3PaymentGateway } from './enums/c3-payment-gateway';

export interface C3Context {
	env: C3Environment;
	vendorId: string;
	paymentGateway: C3PaymentGateway;
	apiKey: string;
}

/**
 * Validates the C3 context variables. Throws an error if any of the required variables are missing.
 *
 * @param c3Context The C3 context variables.
 */
export function validateC3Context(c3Context: C3Context): void {
	if (!c3Context) {
		throw new Error('C3 context variables are required.');
	} else if (!c3Context.env) {
		throw new Error('c3.env context variable is required.');
	} else if (Object.values(C3Environment).includes(c3Context.env)) {
		throw new Error(
			`c3.env context variable is invalid. Must be one of: ${Object.values(C3Environment).join(', ')}`,
		);
	} else if (!c3Context.vendorId) {
		throw new Error('c3.vendorId context variable is required.');
	} else if (!c3Context.paymentGateway) {
		throw new Error('c3.paymentGateway context variable is required.');
	} else if (
		Object.values(C3PaymentGateway).includes(c3Context.paymentGateway)
	) {
		throw new Error(
			`c3.paymentGateway context variable is invalid. Must be one of: ${Object.values(C3PaymentGateway).join(', ')}`,
		);
	} else if (!c3Context.apiKey) {
		throw new Error('c3.apiKey context variable is required.');
	}
}
