/**
 * @type {import ('aws-lambda').Handler}
 */
export async function handler(event) {
	console.log(`EVENT: ${JSON.stringify(event)}`);

	const contactData = event.Details.ContactData;
	const parameters = event.Details.Parameters;

	if (!contactData.InitialContactId) {
		throw new Error('InitialContactId not found.');
	}
	if (!parameters.EventText) {
		throw new Error('EventText parameter not found.');
	}

	const data = structuredClone(parameters);
	delete data.EventText; // We don't need this in the data.
	const hasData = Object.keys(data).length > 0;

	// Send the message to the agent.
	const messageResponse = await fetch(
		`${process.env.C3_BASE_URL}/agent-message`,
		{
			method: 'POST',
			headers: {
				'x-api-key': process.env.C3_API_KEY,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				contactId: contactData.InitialContactId,
				message: {
					eventText: parameters.EventText,
					data: hasData ? data : undefined,
				},
			}),
		},
	);
	if (!messageResponse.ok) {
		throw new Error(
			`Failed to send message to the agent: ${await messageResponse.text()}`,
		);
	}
	const responseBody = await messageResponse.json();
	console.log('Message response:', responseBody);
}
