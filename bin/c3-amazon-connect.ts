#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { C3AmazonConnectStack } from '../lib/c3-amazon-connect-stack.js';
import { promisify } from 'util';
import { exec } from 'child_process';

(async () => {
	const stackVersion = await getMostRecentGitTag();
	const app = new App();
	const stackLabel = app.node.tryGetContext('stackLabel') as string;
	console.log(`Deploying stack version ${stackVersion} for "${stackLabel}"...`);

	const formattedStackLabel = getFormattedStackLabel(stackLabel);
	new C3AmazonConnectStack(app, `C3AmazonConnect${formattedStackLabel}Stack`, {
		description: `Stack containing the resources for C3 for Amazon Connect (${stackVersion}).`,
	});
})();

/**
 * Fetches the most recent git tag in the repository.
 *
 * @returns {Promise<string>} The most recent git tag in the repository
 */
async function getMostRecentGitTag(): Promise<string> {
	const execPromise = promisify(exec);
	try {
		// Execute the git command to get tags sorted by version and pick the latest one
		const { stdout } = await execPromise(
			'git describe --tags `git rev-list --tags --max-count=1`',
		);
		return stdout.trim();
	} catch (error) {
		console.error('Error fetching the most recent git tag:', error);
		return 'v4.0.0';
	}
}

/**
 * Gets the stack label from the context, formatted as a title.
 *
 * @param stackLabel The stack label from the context.
 * @returns A formatted stack label.
 */
function getFormattedStackLabel(stackLabel: string): string {
	const lowerCaseValue = stackLabel.toLowerCase();
	return lowerCaseValue.charAt(0).toUpperCase() + lowerCaseValue.slice(1);
}
