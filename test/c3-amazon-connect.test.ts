import { App } from 'aws-cdk-lib';
import { C3AmazonConnectStack } from '../lib/c3-amazon-connect-stack';
import { Template } from 'aws-cdk-lib/assertions';
import { Context } from '../lib/models/context';
import { C3PaymentGateway } from '../lib/models/enums/c3-payment-gateway';
import { C3Environment } from '../lib/models/enums/c3-environment';

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
		agentInitiatedDigital: true,
		selfServiceDTMF: true,
	},
};

describe('C3AmazonConnectStack', () => {
	const app = new App({
		context: mockContext,
	});
	const stack = new C3AmazonConnectStack(app, 'MyTestStack');
	const template = Template.fromStack(stack);

	// Lambda functions
	describe('Lambda functions', () => {
		it('Using arm64', () => {
			template.hasResourceProperties('AWS::Lambda::Function', {
				Architectures: ['arm64'],
			});
		});

		it('Using latest Node', () => {
			template.hasResourceProperties('AWS::Lambda::Function', {
				Runtime: 'nodejs20.x',
			});
		});

		it('Using code signing', () => {
			template.hasResourceProperties('AWS::Lambda::Function', {
				CodeSigningConfigArn: {
					'Fn::GetAtt': ['CodeSigningConfigD8D41C10', 'CodeSigningConfigArn'],
				},
			});
		});

		it('Has permissions to be invoked by Amazon Connect', () => {
			template.hasResourceProperties('AWS::Lambda::Permission', {
				Action: 'lambda:InvokeFunction',
				Principal: 'connect.amazonaws.com',
			});
		});
	});

	// Amazon Connect flow modules
	describe('Amazon Connect flow modules', () => {
		const flowModules = template.findResources(
			'AWS::Connect::ContactFlowModule',
		);
		it(`Doesn't contain unreplaced placeholders`, () => {
			for (const flowModuleName of Object.keys(flowModules)) {
				const flowModule = flowModules[flowModuleName];
				const flowModuleContent = JSON.stringify(flowModule.Properties.Content);
				expect(flowModuleContent).not.toContain('<');
				expect(flowModuleContent).not.toContain('>');
			}
		});
	});

	// Amazon Connect flows
	describe('Amazon Connect flows', () => {
		const flows = template.findResources('AWS::Connect::ContactFlow');
		it(`Doesn't contain unreplaced placeholders`, () => {
			for (const flowName of Object.keys(flows)) {
				const flow = flows[flowName];
				const flowModuleContent = JSON.stringify(flow.Properties.Content);
				expect(flowModuleContent).not.toContain('<');
				expect(flowModuleContent).not.toContain('>');
			}
		});
	});

	// Amazon Connect views
	describe('Amazon Connect views', () => {});
});
