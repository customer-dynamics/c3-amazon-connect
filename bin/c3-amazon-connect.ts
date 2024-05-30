#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { C3AmazonConnectStack } from '../lib/c3-amazon-connect-stack.js';
import { promisify } from 'util';
import { exec } from 'child_process';

(async () => {
	const stackVersion = await getMostRecentGitTag();
	console.log(`Deploying stack version ${stackVersion}...`);

	const app = new App();
	new C3AmazonConnectStack(app, 'C3AmazonConnectStack', {
		description: `Stack containing the resources for C3 for Amazon Connect (${stackVersion}).`,
	});
})();

/**
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
		return 'v?.?.?';
	}
}
