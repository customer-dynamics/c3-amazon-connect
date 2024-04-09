import axios from 'axios';

export async function handler(event) {
	console.log(`EVENT: ${JSON.stringify(event)}`);

	let contactAttributes = {};

	try {
		contactAttributes = event.Details.ContactData.Attributes;
	} catch (error) {
		console.error('Failed to get contact attributes:', error);
		return {
			statusCode: 400,
			body: JSON.stringify(error),
		};
	}

	const paymentRequestBody = {
		// Environment
		vendorId: process.env.C3_VENDOR_ID,
		logoUrl: process.env.LOGO_URL,
		supportPhone: process.env.SUPPORT_PHONE,
		supportEmail: process.env.SUPPORT_EMAIL,
		ttl: 60,

		// Contact
		subjectId: contactAttributes.subjectId,
		agentId: contactAttributes.agentId || 'automated-ivr-agent',
		contactName: contactAttributes.contactName,
		c2a: {
			payment: {
				amountDue: contactAttributes.paymentAmountDue,
				agingInfo: contactAttributes.paymentAgingInfo,
				minimumPayment: contactAttributes.paymentMinimumPayment,
			},
		},
	};

	try {
		const c3BaseUrl = getC3BaseUrl();
		const paymentRequestResponse = await axios.post(
			`${c3BaseUrl}/payment-request`,
			paymentRequestBody,
			{
				headers: {
					'x-api-key': process.env.C3_API_KEY,
				},
			},
		);

		return {
			statusCode: 200,
			body: JSON.stringify(paymentRequestResponse.data),
		};
	} catch (error) {
		console.error(error);
		return {
			statusCode: 500,
			body: JSON.stringify(error),
		};
	}
}

/**
 * Gets the base URL for the C3 API based on the current environment.
 *
 * @returns {string} The base URL for the C3 API.
 */
function getC3BaseUrl() {
	switch (process.env.C3_ENV) {
		case 'prod':
			return 'https://api.call2action.link';
		case 'staging':
			return 'https://mstp8ccw53.execute-api.us-west-2.amazonaws.com/staging';
		case 'dev':
			return 'https://xr1n4f5p34.execute-api.us-west-2.amazonaws.com/dev';
		default:
			throw new Error(`Invalid environment: ${process.env.C3_ENV}`);
	}
}
