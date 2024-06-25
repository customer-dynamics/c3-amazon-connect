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
	stackEnvName: 'dev',
	amazonConnect: {
		instanceArn: 'placeholder',
		securityKeyId: 'placeholder',
		securityKeyCertificateContent:
			'-----BEGIN CERTIFICATE-----\\n-----END CERTIFICATE-----\\n',
	},
	c3: {
		env: C3Environment.Prod,
		vendorId: 'placeholder',
		paymentGateway: C3PaymentGateway.Zift,
	},
	features: {
		agentAssistedIVR: false,
		agentAssistedLink: false,
		selfServiceIVR: true,
		subjectLookup: SubjectLookupMode.Disabled,
	},
	logoUrl: 'placeholder',
	supportPhone: 'placeholder',
	supportEmail: 'placeholder',
};

const NUMBER_OF_LAMBDAS = 4;

// Verify created resources for agent-assisted IVR.
describe('Self-Service IVR', () => {
	const app = new App({
		context: mockContext,
	});
	const stack = new C3AmazonConnectStack(app, 'MyTestStack');
	const template = Template.fromStack(stack);

	describe('Amazon Connect', () => {
		// Flow modules
		describe('Flow modules', () => {
			it('Has 1 flow module', () => {
				template.resourceCountIs('AWS::Connect::ContactFlowModule', 1);
			});
		});

		// Flows
		describe('Flows', () => {
			it('Has no contact flows', () => {
				template.resourceCountIs('AWS::Connect::ContactFlow', 0);
			});
		});

		// Quick connects
		describe('Quick Connects', () => {
			it('Has no quick connects', () => {
				template.resourceCountIs('AWS::Connect::QuickConnect', 0);
			});
		});

		// Queues
		describe('Queues', () => {
			it('Has no queues', () => {
				template.resourceCountIs('AWS::Connect::Queue', 0);
			});
		});

		// 3rd party apps
		describe('3rd party apps', () => {
			it('Has no 3rd party app', () => {
				// template.resourceCountIs('AWS::Connect::Application', 1);
				template.resourceCountIs(
					'AWS::Connect::IntegrationAssociation',
					NUMBER_OF_LAMBDAS + 0,
				);
			});
		});
	});

	// Lambda functions
	describe('Lambda functions', () => {
		it('Has 4 created functions', () => {
			template.resourceCountIs('AWS::Lambda::Function', NUMBER_OF_LAMBDAS);
		});
	});
});
