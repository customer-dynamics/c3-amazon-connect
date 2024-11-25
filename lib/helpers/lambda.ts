import { Duration, Stack } from 'aws-cdk-lib';
import { CfnIntegrationAssociation } from 'aws-cdk-lib/aws-connect';
import { ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import {
	Architecture,
	Code,
	Function,
	FunctionProps,
	LayerVersionProps,
	Runtime,
} from 'aws-cdk-lib/aws-lambda';

const TARGET_ARCHITECTURE = Architecture.ARM_64;
const TARGET_RUNTIME = Runtime.NODEJS_22_X;

export const commonLambdaLayerProps: LayerVersionProps = {
	code: Code.fromInline('// Not empty'), // Placeholder code. The actual code will be set elsewhere.
	compatibleArchitectures: [TARGET_ARCHITECTURE],
	compatibleRuntimes: [TARGET_RUNTIME],
};

export const commonLambdaProps: FunctionProps = {
	code: Code.fromInline('// Not empty'), // Placeholder code. The actual code will be set elsewhere.
	architecture: TARGET_ARCHITECTURE,
	runtime: TARGET_RUNTIME,
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
	// Workaround to delete the existing associations. Necessary when the naming format changes.
	const skipAssociations = stack.node.tryGetContext('options').skipAssociations;
	if (skipAssociations) {
		console.log('⚠️ Skipping Amazon Connect associations! ⚠️');
		console.log(
			'⚠️⚠️⚠️ Please remember to re-deploy with `skipAssociations` removed so that Amazon Connect can invoke your Lambda functions. ⚠️⚠️⚠️',
		);
		return;
	}

	const instanceArn = stack.node.tryGetContext('amazonConnect').instanceArn;
	for (const lambdaFunction of lambdaFunctions) {
		// Allow Amazon Connect to invoke the Lambda functions.
		console.log(
			`Adding Amazon Connect permissions for function "${lambdaFunction.node.id}"...`,
		);
		lambdaFunction.addPermission('AllowAmazonConnectInvoke', {
			principal: new ServicePrincipal('connect.amazonaws.com'),
			sourceArn: instanceArn,
			sourceAccount: stack.account,
			action: 'lambda:InvokeFunction',
		});

		// Create an integration between the Lambda functions and Amazon Connect.
		console.log(
			`Creating Amazon Connect integration association for function "${lambdaFunction.node.id}"...`,
		);
		new CfnIntegrationAssociation(
			stack,
			`C3ConnectIntegration-${lambdaFunction.node.id}`,
			{
				instanceId: instanceArn,
				integrationType: 'LAMBDA_FUNCTION',
				integrationArn: lambdaFunction.functionArn,
			},
		);
	}
}
