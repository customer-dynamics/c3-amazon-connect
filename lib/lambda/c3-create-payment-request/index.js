import axios from 'axios';

/**
 * @type {import ('aws-lambda').Handler}
 */
export async function handler(event) {
	console.log(`EVENT: ${JSON.stringify(event)}`);
	console.debug('ENV', process.env);

	let contactAttributes = {};

	try {
		contactAttributes = event.Details.ContactData.Attributes;
	} catch (error) {
		console.error('Failed to get contact attributes:', error);
		throw error;
	}

	const paymentRequestBody = {
		// Environment
		vendorId: process.env.C3_VENDOR_ID,
		logoUrl: process.env.LOGO_URL,
		supportPhone: process.env.SUPPORT_PHONE,
		supportEmail: process.env.SUPPORT_EMAIL,
		ttl: 60,

		// Contact
		subjectId: contactAttributes.SubjectId,
		agentId: contactAttributes.AgentId || 'automated-ivr-agent',
		contactName: contactAttributes.ContactName,
		c2a: {
			payment: {
				amountDue: contactAttributes.PaymentAmountDue,
				agingInfo: contactAttributes.PaymentAgingInfo,
				minimumPayment: contactAttributes.PaymentMinimumPayment,
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

		console.log('Payment request response:', paymentRequestResponse.data);
		return {
			PaymentRequestId: paymentRequestResponse.data.id,
		};
	} catch (error) {
		console.error(error);
		throw error;
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
