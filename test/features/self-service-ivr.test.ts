import { App } from 'aws-cdk-lib';
import { C3AmazonConnectStack } from '../../lib/c3-amazon-connect-stack';
import { Template } from 'aws-cdk-lib/assertions';
import { Context } from '../../lib/models/context';
import { C3PaymentGateway } from '../../lib/models/enums/c3-payment-gateway';
import { C3Environment } from '../../lib/models/enums/c3-environment';
import { SubjectLookupMode } from '../../lib/models/enums/subject-lookup-mode';

const mockContext: Context = {
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
		describe('IVR flow module', () => {
			it('Has contact flow module', () => {
				template.resourceCountIs('AWS::Connect::ContactFlowModule', 1);
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
