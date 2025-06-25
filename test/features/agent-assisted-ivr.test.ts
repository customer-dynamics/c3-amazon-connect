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
		logoUrl: 'placeholder',
		supportPhone: 'placeholder',
		supportEmail: 'placeholder',
	},
	features: {
		agentAssistedIVR: true,
		agentAssistedLink: false,
		selfServiceIVR: false,
		subjectLookup: SubjectLookupMode.Disabled,
		receiptApp: false,
	},
	options: {
		codeSigning: true,
		ivrSpeaking: {
			rate: SpeakingRate.Medium,
			volume: SpeakingVolume.Medium,
		},
	},
};

const NUMBER_OF_LAMBDAS = 5;

// Verify created resources for agent-assisted IVR.
describe('Agent Assisted IVR', () => {
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
			it('Has 1 contact flow', () => {
				template.resourceCountIs('AWS::Connect::ContactFlow', 1);
			});
		});

		// Quick connects
		describe('Quick Connects', () => {
			it('Has 1 quick connect', () => {
				template.resourceCountIs('AWS::Connect::QuickConnect', 1);
			});
		});

		// Queues
		describe('Queues', () => {
			it('Has 1 queue', () => {
				template.resourceCountIs('AWS::Connect::Queue', 1);
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
		it('Has 5 created functions', () => {
			template.resourceCountIs('AWS::Lambda::Function', NUMBER_OF_LAMBDAS);
		});
	});

	// IAM
	describe('IAM', () => {
		it('Has a created role', () => {
			template.resourceCountIs('AWS::IAM::Role', NUMBER_OF_LAMBDAS + 1);
		});
		it('Has 5 created policies', () => {
			// Cross org policy and kms policy.
			template.resourceCountIs('AWS::IAM::Policy', 2);
		});
	});
});
