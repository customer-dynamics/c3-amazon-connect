import { App } from 'aws-cdk-lib';
import { C3AmazonConnectStack } from '../lib/c3-amazon-connect-stack';
import { Template } from 'aws-cdk-lib/assertions';
import { readFileSync } from 'fs';

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

test('Flow module content has all replacements', () => {
	const app = new App({
		context: mockContext,
	});
	const stack = new C3AmazonConnectStack(app, 'MyTestStack');
	const template = Template.fromStack(stack);
	const flowModules = template.findResources('AWS::Connect::ContactFlowModule');
	for (const flowModuleName of Object.keys(flowModules)) {
		const flowModule = flowModules[flowModuleName];
		const flowModuleContent = JSON.stringify(flowModule.Properties.Content);
		expect(flowModuleContent).not.toContain('<');
		expect(flowModuleContent).not.toContain('>');
	}
});

test('Flow content has all replacements', () => {
	const app = new App({
		context: mockContext,
	});
	const stack = new C3AmazonConnectStack(app, 'MyTestStack');
	const template = Template.fromStack(stack);
	const flowModules = template.findResources('AWS::Connect::ContactFlow');
	for (const flowModuleName of Object.keys(flowModules)) {
		const flowModule = flowModules[flowModuleName];
		const flowModuleContent = JSON.stringify(flowModule.Properties.Content);
		expect(flowModuleContent).not.toContain('<');
		expect(flowModuleContent).not.toContain('>');
	}
});
