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
		subjectLookup: SubjectLookupMode.Disabled,
	},
	options: {
		codeSigning: true,
	},
	logoUrl: 'placeholder',
	supportPhone: 'placeholder',
	supportEmail: 'placeholder',
};

const NUMBER_OF_LAMBDAS = 5;

// Verify created resources for agent-assisted IVR.
describe('Workspace app', () => {
	// 3rd party apps
	describe('3rd party apps', () => {
		it('Has 1 3rd party app when flag is true', () => {
			const app = new App({
				context: mockContext,
			});
			const stack = new C3AmazonConnectStack(app, 'MyTestStack');
			const template = Template.fromStack(stack);

			// template.resourceCountIs('AWS::Connect::Application', 1);
			template.resourceCountIs(
				'AWS::Connect::IntegrationAssociation',
				NUMBER_OF_LAMBDAS + 1,
			);
		});

		it('Has no 3rd party apps when flag is false', () => {
			mockContext.amazonConnect.workspaceApp = false;
			const app = new App({
				context: mockContext,
			});
			const stack = new C3AmazonConnectStack(app, 'MyTestStack');
			const template = Template.fromStack(stack);
			// template.resourceCountIs('AWS::Connect::Application', 0);
			template.resourceCountIs(
				'AWS::Connect::IntegrationAssociation',
				NUMBER_OF_LAMBDAS,
			);
		});
	});
});
