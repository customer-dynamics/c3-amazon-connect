import { Duration, Stack } from 'aws-cdk-lib';
import { CfnIntegrationAssociation } from 'aws-cdk-lib/aws-connect';
import { ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Architecture, Function, Runtime } from 'aws-cdk-lib/aws-lambda';

let integrationNumber = 1;

export const commonLambdaProps = {
	architecture: Architecture.ARM_64,
	runtime: Runtime.NODEJS_20_X,
	timeout: Duration.seconds(8),
	handler: 'index.handler',
	memorySize: 256,
};

/**
 * Associates the created Lambda functions with Amazon Connect. Adds permissions to let your Amazon Connect instance invoke
 * the functions and creates an integration between the functions and Amazon Connect.
 *
 * This is necessary for Amazon Connect to be able to invoke the Lambda functions within the flows.
 *
 * @param lambdaFunctions The Lambda functions to associate with Amazon Connect.
 */
export function associateLambdaFunctionsWithConnect(
	stack: Stack,
	lambdaFunctions: Function[],
): void {
	const instanceArn = stack.node.tryGetContext('amazonConnect').instanceArn;
	for (const lambdaFunction of lambdaFunctions) {
		// Allow Amazon Connect to invoke the Lambda functions.
		console.log('Adding Amazon Connect permissions for function...');
		lambdaFunction.addPermission('AllowAmazonConnectInvoke', {
			principal: new ServicePrincipal('connect.amazonaws.com'),
			sourceArn: instanceArn,
			sourceAccount: stack.account,
			action: 'lambda:InvokeFunction',
		});

		// Create an integration between the Lambda functions and Amazon Connect.
		console.log(
			'Creating Amazon Connect integration association for function...',
		);
		new CfnIntegrationAssociation(
			stack,
			`ConnectIntegrationFunction${integrationNumber}`,
			{
				instanceId: instanceArn,
				integrationType: 'LAMBDA_FUNCTION',
				integrationArn: lambdaFunction.functionArn,
			},
		);
		integrationNumber++;
	}
}
