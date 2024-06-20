import {
	SecretsManagerClient,
	GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

let c3ApiKey = '';

/**
 * @type {import ('aws-lambda').Handler}
 */
export async function handler(event) {
	console.log(`EVENT: ${JSON.stringify(event)}`);

	// Get the contact attributes.
	let contactAttributes = {};
	contactAttributes = event.Details.ContactData.Attributes;

	// Get the API key.
	if (!c3ApiKey) {
		const secretsManagerClient = new SecretsManagerClient();
		const getSecretValueCommand = new GetSecretValueCommand({
			SecretId: 'C3_API_KEY',
		});
		c3ApiKey = (await secretsManagerClient.send(getSecretValueCommand))
			.SecretString;
		if (!c3ApiKey) {
			throw new Error('No value found for C3_API_KEY secret.');
		}
		if (c3ApiKey === '<Your C3 API key>') {
			throw new Error('Value for C3_API_KEY secret is not set.');
		}
	} else {
		console.log('Using API key in memory.');
	}

	// Create the payment request.
	const paymentRequestBody = {
		// Environment
		vendorId: process.env.C3_VENDOR_ID,
		logoUrl: process.env.LOGO_URL,
		supportPhone: process.env.SUPPORT_PHONE,
		supportEmail: process.env.SUPPORT_EMAIL,
		ttl: 60,

		// Contact
		subjectId: contactAttributes.SubjectId,
		agentId: contactAttributes.AgentId || 'self-service-ivr-agent',
		contactName: contactAttributes.ContactName,
		c2a: {
			payment: {
				amountDue: contactAttributes.PaymentAmountDue,
				agingInfo: contactAttributes.PaymentAgingInfo,
				minimumPayment: contactAttributes.PaymentMinimumPayment,
			},
		},
	};

	const paymentRequestResponse = await fetch(
		`${process.env.C3_BASE_URL}/payment-request`,
		{
			method: 'POST',
			headers: {
				'x-api-key': c3ApiKey,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(paymentRequestBody),
		},
	);
	const paymentRequestResponseJson = await paymentRequestResponse.json();
	console.log('Payment request response:', paymentRequestResponseJson);

	if (!paymentRequestResponse.ok) {
		throw new Error(
			`Failed to create payment request: ${paymentRequestResponseJson.message}`,
		);
	}

	return {
		PaymentRequestId: paymentRequestResponseJson.id,
	};
}
