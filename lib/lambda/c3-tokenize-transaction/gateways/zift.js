import { getSecrets } from '../lib/secrets.js';

const ZIFT_URL = process.env.ZIFT_URL;

export async function tokenizeCard(cardNumber, cardExp) {
	const parameters = await getSecrets(
		'ZIFT_ACCOUNT_ID',
		'ZIFT_USERNAME',
		'ZIFT_PASSWORD',
	);
	try {
		console.log('tokenizing card');

		const requestBody = {
			requestType: 'tokenization',
			userName: parameters[ZIFT_USERNAME],
			password: parameters[ZIFT_PASSWORD],
			accountId: parameters[ZIFT_ACCOUNT_ID],
			accountType: 'R',
			accountNumber: cardNumber,
			accountAccessory: cardExp,
		};
		console.log('request body', requestBody);
		const response = await fetch(ZIFT_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(requestBody),
		});
		if (response.ok) {
			const body = await response.text();
			console.log('body', body);
			const jsonBody = JSON.parse(body);
			console.log('tokenized card');
			return jsonBody.token;
		} else {
			console.error('error tokenizing card', await response.text());
			return {
				error: response.statusText,
			};
		}
	} catch (error) {
		console.error(error);
		return {
			error: error.message,
		};
	}
}
