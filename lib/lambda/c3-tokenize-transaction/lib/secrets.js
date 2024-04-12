import {
	SecretsManagerClient,
	BatchGetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

const secretsManager = new SecretsManagerClient();

/**
 * Get secret values from AWS Secrets Manager.
 * @param  {...string} names
 * @returns Promise<string | null | any>
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
	if (data.SecretValues?.length === 1) {
		return data.SecretValues[0].SecretString;
	} else {
		return data.SecretValues?.reduce((previousObj, currentObj) => {
			return Object.assign(previousObj, {
				[currentObj.Name]: currentObj.SecretString,
			});
		}, {});
	}
}
