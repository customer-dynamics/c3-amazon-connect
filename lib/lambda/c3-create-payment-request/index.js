/**
 * @type {import ('aws-lambda').Handler}
 */
export async function handler(event) {
	console.log(`EVENT: ${JSON.stringify(event)}`);

	// Get the contact attributes.
	let contactAttributes = {};
	contactAttributes = event.Details.ContactData.Attributes;

	// Create metadata for updating the balance in Safe Select (optional).
	const metadata = {
		safeSelect: {
			id: contactAttributes.C3SubjectId,
			lookupBy: 'externalId',
			customField: 'balance',
		},
	};

	const paymentRequestBody = {
		// Environment
		vendorId: process.env.C3_VENDOR_ID,
		logoUrl: process.env.LOGO_URL,
		supportPhone: process.env.SUPPORT_PHONE,
		supportEmail: process.env.SUPPORT_EMAIL,
		ttl: 60,

		// Contact
		subjectId: contactAttributes.C3SubjectId,
		agentId: contactAttributes.AgentId || 'self-service-ivr-agent',
		contactName: `${contactAttributes.C3ContactFirstName} ${contactAttributes.C3ContactLastName}`,
		c2a: {
			payment: {
				amountDue: contactAttributes.C3PaymentAmountDue,
				agingInfo: contactAttributes.PaymentAgingInfo,
				minimumPayment: contactAttributes.C3PaymentMinimumPayment,
			},
		},
		metaData: JSON.stringify(metadata),
	};
	console.debug('Payment request body:', paymentRequestBody);

	// Create the payment request.
	console.log('Creating the payment request...');
	const paymentRequestResponse = await fetch(
		`${process.env.C3_BASE_URL}/payment-request`,
		{
			method: 'POST',
			headers: {
				'x-api-key': process.env.C3_API_KEY,
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

	console.log(
		`Payment request ${paymentRequestResponseJson.id} created successfully.`,
	);
	return {
		C3PaymentRequestId: paymentRequestResponseJson.id,
	};
}
