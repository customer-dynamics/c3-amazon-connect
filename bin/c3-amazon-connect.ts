#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { C3AmazonConnectStack } from '../lib/c3-amazon-connect-stack';

const app = new App();
new C3AmazonConnectStack(app, 'C3AmazonConnectStack', {});
