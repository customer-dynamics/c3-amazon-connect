import { App } from 'aws-cdk-lib';
import { C3AmazonConnectStack } from '../lib/c3-amazon-connect-stack';
import { Template } from 'aws-cdk-lib/assertions';
import {
	C3Environment,
	C3PaymentGateway,
	Context,
	SubjectLookupMode,
} from '../lib/models';

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
		agentAssistedLink: true,
		selfServiceIVR: true,
		subjectLookup: SubjectLookupMode.RequiredEditable,
	},
	options: {
		codeSigning: true,
	},
	logoUrl: 'placeholder',
	supportPhone: 'placeholder',
	supportEmail: 'placeholder',
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
					'Fn::GetAtt': [
						'C3CodeSigningConfigFA211695', // FIXME: This identifier at the end always changes
						'CodeSigningConfigArn',
					],
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
				expect(flowModuleContent).not.toMatch(/<<[^>]+>>/);
			}
		});

		it(`Doesn't contain working copy text`, () => {
			for (const flowModuleName of Object.keys(flowModules)) {
				const flowModule = flowModules[flowModuleName];
				const flowModuleContent = JSON.stringify(flowModule.Properties.Content);
				expect(flowModuleContent).not.toMatch(/(Working Copy)/);
			}
		});
	});

	// Amazon Connect flows
	describe('Amazon Connect flows', () => {
		const flows = template.findResources('AWS::Connect::ContactFlow');
		it(`Doesn't contain unreplaced placeholders`, () => {
			for (const flowName of Object.keys(flows)) {
				const flow = flows[flowName];
				const flowContent = JSON.stringify(flow.Properties.Content);
				expect(flowContent).not.toMatch(/<<[^>]+>>/);
			}
		});

		it(`Doesn't contain working copy text`, () => {
			for (const flowName of Object.keys(flows)) {
				const flow = flows[flowName];
				const flowModuleContent = JSON.stringify(flow.Properties.Content);
				expect(flowModuleContent).not.toMatch(/(Working Copy)/);
			}
		});
	});
});
