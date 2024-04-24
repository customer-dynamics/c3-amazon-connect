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
		apiKey: 'placeholder',
		vendorId: 'placeholder',
		paymentGateway: C3PaymentGateway.Zift,
	},
	logoUrl: 'placeholder',
	supportPhone: 'placeholder',
	supportEmail: 'placeholder',
	features: {
		agentInitiatedDTMF: true,
		agentInitiatedDigital: false,
		selfServiceDTMF: false,
	},
};

const NUMBER_OF_LAMBDAS = 5;

// Verify created resources for agent-initiated DTMF.
describe('Agent Initiated DTMF', () => {
	const app = new App({
		context: mockContext,
	});
	const stack = new C3AmazonConnectStack(app, 'MyTestStack');
	const template = Template.fromStack(stack);

	describe('Amazon Connect', () => {
		describe('DTMF flow', () => {
			it('Has contact flow', () => {
				template.resourceCountIs('AWS::Connect::ContactFlow', 2);
			});
		});

		describe('C3 Quick Connect', () => {
			it('Has quick connect', () => {
				template.resourceCountIs('AWS::Connect::QuickConnect', 1);
			});
		});
	});

	// Lambda functions
	describe('Lambda functions', () => {
		it('Has 5 created functions', () => {
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

	// IAM
	describe('IAM', () => {
		it('Has a created role', () => {
			template.resourceCountIs('AWS::IAM::Role', NUMBER_OF_LAMBDAS + 1);
		});
		it('Has a created policy', () => {
			template.resourceCountIs('AWS::IAM::Policy', 2); // Cross org policy and secret policy
		});
	});
});
