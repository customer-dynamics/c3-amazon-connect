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
		codeSigning: false,
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

		it('Has code signing disabled', () => {
			template.resourcePropertiesCountIs(
				'AWS::Lambda::Function',
				{
					CodeSigningConfigArn: {
						'Fn::GetAtt': [
							'C3CodeSigningConfigFA211695', // FIXME: This identifier at the end always changes
							'CodeSigningConfigArn',
						],
					},
				},
				0,
			);
		});
	});
});
