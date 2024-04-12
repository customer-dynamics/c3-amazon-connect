import { getSecrets } from '../lib/secrets.js';

const ZIFT_USERNAME = 'ZIFT_USERNAME';
const ZIFT_PASSWORD = 'ZIFT_PASSWORD';
const ZIFT_ACCOUNT_ID = 'ZIFT_ACCOUNT_ID';

const ZIFT_URL = process.env.GATEWAY_URL;

export async function tokenizeCard(cardNumber, cardExp) {
	const parameters = await getSecrets(
		ZIFT_ACCOUNT_ID,
		ZIFT_USERNAME,
		ZIFT_PASSWORD,
	);
	try {
		const response = await fetch(ZIFT_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				requestType: 'tokenization',
				userName: parameters[ZIFT_USERNAME],
				password: parameters[ZIFT_PASSWORD],
				accountId: parameters[ZIFT_ACCOUNT_ID],
				accountType: 'R',
				accountNumber: cardNumber,
				accountAccessory: cardExp,
			}),
		});

		const body = await response.json();

		return body.token;
	} catch (error) {
		return {
			error: error.message,
		};
	}
}
