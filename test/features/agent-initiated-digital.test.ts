import { App } from 'aws-cdk-lib';
import { C3AmazonConnectStack } from '../../lib/c3-amazon-connect-stack';
import { Template } from 'aws-cdk-lib/assertions';
import { Context } from '../../lib/models/context';
import { C3PaymentGateway } from '../../lib/models/enums/c3-payment-gateway';
import { C3Environment } from '../../lib/models/enums/c3-environment';

const mockContext: Context = {
	amazonConnect: {
		instanceArn: 'placeholder',
		securityKeyId: 'placeholder',
		securityKeyCertificateContent: 'placeholder',
	},
	c3: {
		env: C3Environment.Prod,
		vendorId: 'placeholder',
		paymentGateway: C3PaymentGateway.Zift,
	},
	logoUrl: 'placeholder',
	supportPhone: 'placeholder',
	supportEmail: 'placeholder',
	features: {
		agentInitiatedIVR: false,
		agentInitiatedDigital: true,
		selfServiceIVR: false,
	},
};

const NUMBER_OF_LAMBDAS = 0;

// Verify created resources for agent-initiated IVR.
describe('Self-Service Digital', () => {
	const app = new App({
		context: mockContext,
	});
	const stack = new C3AmazonConnectStack(app, 'MyTestStack');
	const template = Template.fromStack(stack);

	describe('Amazon Connect', () => {
		describe('IVR contact flow', () => {
			it('Has no contact flow', () => {
				template.resourceCountIs('AWS::Connect::ContactFlow', 0);
			});
		});

		describe('IVR flow module', () => {
			it('Has no contact flow module', () => {
				template.resourceCountIs('AWS::Connect::ContactFlowModule', 0);
			});
		});
	});

	// Lambda functions
	describe('Lambda functions', () => {
		it('Has 0 created functions', () => {
			template.resourceCountIs('AWS::Lambda::Function', NUMBER_OF_LAMBDAS);
		});
	});

	// 3rd party apps
	describe('3rd party apps', () => {
		it('Has a 3rd party app', () => {
			// template.resourceCountIs('AWS::Connect::Application', 1);
			template.resourceCountIs(
				'AWS::Connect::IntegrationAssociation',
				NUMBER_OF_LAMBDAS + 1,
			);
		});
	});
});
