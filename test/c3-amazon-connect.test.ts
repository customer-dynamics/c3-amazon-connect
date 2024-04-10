import { App } from 'aws-cdk-lib';
import { C3AmazonConnectStack } from '../lib/c3-amazon-connect-stack';
import { Template } from 'aws-cdk-lib/assertions';

const mockContext = {
	amazonConnectInstanceArn: 'placeholder',
	amazonConnectSecurityKeyId: 'placeholder',
	amazonConnectSecurityKeyCertificateContent: 'placeholder',
	c3Env: 'prod',
	c3ApiKey: 'placeholder',
	c3VendorId: 'placeholder',
	logoUrl: 'placeholder',
	supportPhone: 'placeholder',
	supportEmail: 'placeholder',
};

test('Lambdas using arm64', () => {
	const app = new App({
		context: mockContext,
	});
	const stack = new C3AmazonConnectStack(app, 'MyTestStack');
	const template = Template.fromStack(stack);
	template.hasResourceProperties('AWS::Lambda::Function', {
		Architectures: ['arm64'],
	});
});

test('Lambdas using latest Node', () => {
	const app = new App({
		context: mockContext,
	});
	const stack = new C3AmazonConnectStack(app, 'MyTestStack');
	const template = Template.fromStack(stack);
	template.hasResourceProperties('AWS::Lambda::Function', {
		Runtime: 'nodejs20.x',
	});
});
