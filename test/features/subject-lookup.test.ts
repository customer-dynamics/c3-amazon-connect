import { App } from 'aws-cdk-lib';
import { C3AmazonConnectStack } from '../../lib/c3-amazon-connect-stack';
import { Template } from 'aws-cdk-lib/assertions';
import {
	C3Environment,
	C3PaymentGateway,
	Context,
	SubjectLookupMode,
} from '../../lib/models';

const mockContext: Context = {
	stackLabel: 'dev',
	amazonConnect: {
		instanceArn: 'placeholder',
		securityKeyId: 'placeholder',
		securityKeyCertificateContent:
			'-----BEGIN CERTIFICATE-----\\n-----END CERTIFICATE-----\\n',
		workspaceApp: true,
		receiptQueueArn: 'placeholder',
	},
	c3: {
		env: C3Environment.Prod,
		vendorId: 'placeholder',
		paymentGateway: C3PaymentGateway.Zift,
	},
	features: {
		agentAssistedIVR: true,
		agentAssistedLink: false,
		selfServiceIVR: false,
		subjectLookup: SubjectLookupMode.OptionalEditable,
	},
	options: {
		codeSigning: true,
	},
	logoUrl: 'placeholder',
	supportPhone: 'placeholder',
	supportEmail: 'placeholder',
};

const NUMBER_OF_LAMBDAS = 7;

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
		it('Has 6 created functions', () => {
			template.resourceCountIs('AWS::Lambda::Function', NUMBER_OF_LAMBDAS);
		});
	});

	// IAM
	describe('IAM', () => {
		it('Has 1 created role', () => {
			template.resourceCountIs('AWS::IAM::Role', NUMBER_OF_LAMBDAS + 1);
		});
		it('Has 5 created policies', () => {
			// Cross org policy, 3 secrets policies, and kms policy
			template.resourceCountIs('AWS::IAM::Policy', 5);
		});
	});
});
