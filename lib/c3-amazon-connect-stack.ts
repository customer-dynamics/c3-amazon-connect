import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Architecture, Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import path = require('path');

export class C3AmazonConnectStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const createPaymentRequestFunction = new Function(this, 'c3CreatePaymentRequest', {
      description: "Creates a payment request through the C3 API.",
      architecture: Architecture.ARM_64,
      timeout: Duration.seconds(10),
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.js',
      code: Code.fromAsset(path.join(__dirname, 'lambda/c3-create-payment-request')),
    });

    const reportCustomerActivityFunction = new Function(this, 'c3ReportCustomerActivity', {
      description: "Reports customer payment activity through C3 to the agent.",
      architecture: Architecture.ARM_64,
      timeout: Duration.seconds(10),
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.js',
      code: Code.fromAsset(path.join(__dirname, 'lambda/c3-report-customer-activity')),
    });

    const tokenizeTransactionFunction = new Function(this, 'c3TokenizeTransaction', {
      description: "Tokenizes customer payment details and submits to C3 for processing.",
      architecture: Architecture.ARM_64,
      timeout: Duration.seconds(10),
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.js',
      code: Code.fromAsset(path.join(__dirname, 'lambda/c3-tokenize-transaction')),
    });

  }
}
