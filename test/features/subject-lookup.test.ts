import { App } from 'aws-cdk-lib';
import { C3AmazonConnectStack } from '../../lib/c3-amazon-connect-stack';
import { Template } from 'aws-cdk-lib/assertions';
import {
	C3Environment,
	C3PaymentGateway,
	Context,
	SpeakingRate,
	SpeakingVolume,
	SubjectLookupMode,
} from '../../lib/models';

const mockContext: Context = {
	stackLabel: 'dev',
	amazonConnect: {
		instanceArn: 'placeholder',
		securityKeyId: 'placeholder',
		securityKeyCertificateContent:
			'-----BEGIN CERTIFICATE-----\\n-----END CERTIFICATE-----\\n',
		addAppsToWorkspace: true,
		receiptQueueArn: 'placeholder',
	},
	c3: {
		env: C3Environment.Prod,
		vendorId: 'placeholder',
		paymentGateway: C3PaymentGateway.Zift,
		apiKey: 'placeholder',
	},
	features: {
		agentAssistedIVR: true,
		agentAssistedLink: false,
		selfServiceIVR: false,
		subjectLookup: SubjectLookupMode.OptionalEditable,
		receiptApp: false,
	},
	options: {
		codeSigning: true,
		ivrSpeaking: {
			rate: SpeakingRate.Medium,
			volume: SpeakingVolume.Medium,
		},
	},
	logoUrl: 'placeholder',
	supportPhone: 'placeholder',
	supportEmail: 'placeholder',
};

const NUMBER_OF_LAMBDAS = 6;

// Verify created resources for subject lookup.
describe('Subject Lookup', () => {
	const app = new App({
		context: mockContext,
	});
	const stack = new C3AmazonConnectStack(app, 'MyTestStack');
	const template = Template.fromStack(stack);

	describe('Amazon Connect', () => {
		// Flow modules
		describe('Flow modules', () => {
			it('Has no flow modules', () => {
				template.resourceCountIs('AWS::Connect::ContactFlowModule', 0);
			});
		});

		// Flows
		describe('Flows', () => {
			it('Has 2 contact flows', () => {
				template.resourceCountIs('AWS::Connect::ContactFlow', 2);
			});
		});

		// Quick connects
		describe('Quick Connects', () => {
			it('Has 2 quick connects', () => {
				template.resourceCountIs('AWS::Connect::QuickConnect', 2);
			});
		});

		// Queues
		describe('Queues', () => {
			it('Has 2 queues', () => {
				template.resourceCountIs('AWS::Connect::Queue', 2);
			});
		});

		// 3rd party apps
		describe('3rd party apps', () => {
			it('Has 1 3rd party app', () => {
				// template.resourceCountIs('AWS::Connect::Application', 1);
				template.resourceCountIs(
					'AWS::Connect::IntegrationAssociation',
					NUMBER_OF_LAMBDAS + 1,
				);
			});
		});
	});

	// Lambda functions
	describe('Lambda functions', () => {
		it('Has 7 created functions', () => {
			template.resourceCountIs('AWS::Lambda::Function', NUMBER_OF_LAMBDAS);
		});
	});

	// IAM
	describe('IAM', () => {
		it('Has 1 created role', () => {
			template.resourceCountIs('AWS::IAM::Role', NUMBER_OF_LAMBDAS + 1);
		});
		it('Has 6 created policies', () => {
			// Cross org policy and kms policy.
			template.resourceCountIs('AWS::IAM::Policy', 2);
		});
	});
});
