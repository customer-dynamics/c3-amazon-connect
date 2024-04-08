import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { CfnContactFlowModule } from 'aws-cdk-lib/aws-connect';
import { Architecture, Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import path = require('path');
import { getBaseDtmfPaymentFlowModuleContent } from './connect/flows';

export class C3AmazonConnectStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Validate context variables.
    const amazonConnectInstanceArn = this.node.tryGetContext('amazonConnectInstanceArn');
    if (!amazonConnectInstanceArn) {
      throw new Error('amazonConnectInstanceArn context variable is required.');
    }

    // Create the Lambda functions.
    const createPaymentRequestFunction = new Function(this, 'c3CreatePaymentRequest', {
      description: 'Creates a payment request through the C3 API.',
      architecture: Architecture.ARM_64,
      timeout: Duration.seconds(10),
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.js',
      code: Code.fromAsset(path.join(__dirname, 'lambda/c3-create-payment-request')),
    });

    const reportCustomerActivityFunction = new Function(this, 'c3ReportCustomerActivity', {
      description: 'Reports customer payment activity through C3 to the agent.',
      architecture: Architecture.ARM_64,
      timeout: Duration.seconds(10),
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.js',
      code: Code.fromAsset(path.join(__dirname, 'lambda/c3-report-customer-activity')),
    });

    const tokenizeTransactionFunction = new Function(this, 'c3TokenizeTransaction', {
      description: 'Tokenizes customer payment details and submits to C3 for processing.',
      architecture: Architecture.ARM_64,
      timeout: Duration.seconds(10),
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.js',
      code: Code.fromAsset(path.join(__dirname, 'lambda/c3-tokenize-transaction')),
    });

    // Create the Amazon Connect flows.
    const baseDTMFPaymentFlowModule = new CfnContactFlowModule(this, 'c3BaseDTMFPaymentFlowModule', {
      name: 'C3 Base DTMF Payment',
      description: 'Flow module for collecting payments with C3 using DTMF.',
      content: getBaseDtmfPaymentFlowModuleContent(
        createPaymentRequestFunction.functionArn,
        reportCustomerActivityFunction.functionArn,
        tokenizeTransactionFunction.functionArn
      ),
      instanceArn: amazonConnectInstanceArn,
    });

  }
}
