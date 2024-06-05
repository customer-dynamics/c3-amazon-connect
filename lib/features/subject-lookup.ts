import { Stack } from 'aws-cdk-lib';
import {
	CfnContactFlow,
	CfnHoursOfOperation,
	CfnQueue,
	CfnQuickConnect,
} from 'aws-cdk-lib/aws-connect';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Code, CodeSigningConfig, Function } from 'aws-cdk-lib/aws-lambda';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

import {
	associateLambdaFunctionsWithConnect,
	commonLambdaProps,
} from '../helpers/lambda';
import { AmazonConnectContext } from '../models/amazon-connect-context';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { getSubjectLookupFlowContent } from '../connect/content-transformations';

/**
 * Class for creating the necessary resources to facilitate subject lookup in agent-assisted payment scenarios.
 */
export class SubjectLookup {
	private subjectLookupFunction: Function;
	private reportSubjectLookupStateFunction: Function;
	private subjectLookupQueue: CfnQueue;
	private subjectLookupFlow: CfnContactFlow;

	/**
	 * Creates the necessary resources to facilitate subject lookup in agent-assisted payment scenarios.
	 */
	constructor(
		private stack: Stack,
		private amazonConnectContext: AmazonConnectContext,
		private codeSigningConfig: CodeSigningConfig,
		private c3BaseUrl: string,
		private c3ApiKeySecret: Secret,
		private hoursOfOperation: CfnHoursOfOperation,
	) {
		console.log('Creating resources for subject lookup...');
		this.createSubjectLookupFunction();
		this.createReportSubjectLookupStateFunction();
		associateLambdaFunctionsWithConnect(this.stack, [
			this.subjectLookupFunction,
			this.reportSubjectLookupStateFunction,
		]);
		this.createSubjectLookupQueue();
		this.createSubjectLookupFlow();
		this.createSubjectLookupQuickConnect();
	}

	/**
	 * Creates a Lambda function for getting the information about a subject.
	 *
	 * This function is necessary in order to support subject lookup.
	 */
	private createSubjectLookupFunction(): void {
		console.log('Creating function C3SubjectLookup...');
		this.subjectLookupFunction = new Function(this.stack, 'C3SubjectLookup', {
			...commonLambdaProps,
			description:
				'Gets the details about a subject to pre-fill in the C3 workspace.',
			code: Code.fromAsset(join(__dirname, '../lambda/c3-subject-lookup')),
			codeSigningConfig: this.codeSigningConfig,
		});
	}

	/**
	 * Creates a Lambda function for reporting the current state of subject lookup.
	 *
	 * This function is necessary for reporting the status of subject lookup and to provide the subject details to the workspace.
	 */
	private createReportSubjectLookupStateFunction(): void {
		console.log('Creating function C3ReportSubjectLookupState...');
		this.reportSubjectLookupStateFunction = new Function(
			this.stack,
			'C3ReportSubjectLookupState',
			{
				...commonLambdaProps,
				description:
					'Reports subject lookup state information to the agent workspace.',
				code: Code.fromAsset(
					join(__dirname, '../lambda/c3-report-subject-lookup-state'),
				),
				codeSigningConfig: this.codeSigningConfig,
				environment: {
					C3_BASE_URL: this.c3BaseUrl,
				},
			},
		);

		// Allow the function to access the C3 API key secret.
		const getSecretValuePolicy = new PolicyStatement({
			actions: ['secretsmanager:GetSecretValue'],
			resources: [this.c3ApiKeySecret.secretArn],
		});
		this.reportSubjectLookupStateFunction.addToRolePolicy(getSecretValuePolicy);
	}

	/**
	 * Creates the queue for the subject lookup quick connect.
	 *
	 * This queue is required so that an agent can look up subject information using a quick connect.
	 */
	private createSubjectLookupQueue(): void {
		console.log('Creating subject lookup quick connect queue...');
		this.subjectLookupQueue = new CfnQueue(this.stack, 'C3SubjectLookupQueue', {
			name: 'C3 Subject Lookup Quick Connect Queue',
			description:
				'Queue for looking up subject information for the C3 agent workspace.',
			instanceArn: this.amazonConnectContext.instanceArn,
			hoursOfOperationArn: this.hoursOfOperation.attrHoursOfOperationArn,
		});
	}

	/**
	 * Creates a Amazon Connect flow for looking up subject information.
	 *
	 * This flow is required to look up subject information in the agent workspace.
	 */
	private createSubjectLookupFlow(): void {
		console.log('Creating flow C3SubjectLookupFlow...');
		const subjectLookupFlowContent = getSubjectLookupFlowContent(
			this.subjectLookupFunction,
			this.reportSubjectLookupStateFunction,
		);
		if (!existsSync('./exports')) {
			mkdirSync('./exports');
		}
		writeFileSync('./exports/C3SubjectLookupFlow', subjectLookupFlowContent);
		this.subjectLookupFlow = new CfnContactFlow(
			this.stack,
			'C3SubjectLookupFlow',
			{
				name: 'C3 Subject Lookup',
				description:
					'Flow to look up subject information in the agent workspace.',
				content: subjectLookupFlowContent,
				instanceArn: this.amazonConnectContext.instanceArn,
				type: 'QUEUE_TRANSFER',
			},
		);
	}

	/**
	 * Creates a quick connect to allow agents to look up subject information.
	 *
	 * This quick connect is required to look up subject information in the agent workspace.
	 */
	private createSubjectLookupQuickConnect(): void {
		console.log('Creating quick connect...');
		new CfnQuickConnect(this.stack, 'C3SubjectLookupQuickConnect', {
			instanceArn: this.amazonConnectContext.instanceArn,
			name: 'Subject Lookup',
			description:
				'Quick connect for looking up subject information for the C3 agent workspace.',
			quickConnectConfig: {
				quickConnectType: 'QUEUE',
				queueConfig: {
					contactFlowArn: this.subjectLookupFlow.attrContactFlowArn,
					queueArn: this.subjectLookupQueue.attrQueueArn,
				},
			},
		});
	}
}
