import {
	SecretsManagerClient,
	BatchGetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

const secretsManager = new SecretsManagerClient();

/**
 * Gets secret values from AWS Secrets Manager.
 *
 * @param  {...string} names An array of secret names to retrieve.
 * @returns {Promise<string | null | any>} The secret values.
 */
export async function getSecrets(...names) {
	const data = await secretsManager.send(
		new BatchGetSecretValueCommand({
			SecretIdList: names,
		}),
	);
	if (!data.SecretValues) {
		return null;
	}
	return data.SecretValues?.reduce((previousObj, currentObj) => {
		return Object.assign(previousObj, {
			[currentObj.Name]: currentObj.SecretString,
		});
	}, {});
}