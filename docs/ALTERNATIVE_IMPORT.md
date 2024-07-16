# Alternative Import

## Description

If you are unable to use the standard `npm run deploy` process using the CDK, you can use the alternative import method to deploy the stack. This method involves some additional manual steps of creating an SSM parameter, S3 bucket, and importing a generated CloudFormation template.

It might be necessary to use the alternative import method in the following instances:

- Your user lacks the Amazon Elastic Container Registry (ECR) permissions required for the CDK to deploy.
- Your AWS account was set up through [Salesforce Service Cloud Voice](https://trailhead.salesforce.com/content/learn/modules/service-cloud-voice/service-voice-learn).
  - This prevents even your _root_ user from having ECR permissions.

## Process

1. Run `npm run synth` to generate the CloudFormation template and Lambda assets. This will populate the `cdk.out` directory with the generated files.

2. Create a new parameter in the [Parameter Store](console.aws.amazon.com/systems-manager/parameters) section of AWS Systems Manager. This parameter must be in the same region as your Amazon Connect instance and the same region you specified in the `cdk.context.json` file. **This parameter must have a specific name**. Open your `cdk.out/C3AmazonConnect**Stack.template.json` file and find the phrase "cdk-bootstrap". Find the value of the `"Default"` key, which should look like `/cdk-bootstrap/hnb659fds/version`. Use this for the name of your bucket. Use `1` as the value for the parameter. All other items can be left as default.

3. Create a new bucket in [Amazon S3](https://console.aws.amazon.com/s3) to store the Code for the Lambda functions. This bucket must be in the same region as your Amazon Connect instance and the same region you specified in the `cdk.context.json` file. **This bucket must have a specific name**. Open your `cdk.out/C3AmazonConnect**Stack.assets.json` file and find the `bucketName` property. Use this name for your bucket, replacing any of the `${}` placeholders with the appropriate values. This should look something like `cdk-hnb659fds-assets-815407490078-us-west-2`.

4. While in the `cdk.out` directory, individually compress all of the `asset.*` folders into separate .zip files.

5. After each .zip file is created, remove the "asset." prefix from the file name. For example, `asset.1234567890.zip` should be renamed to `1234567890.zip`.

6. Upload all of the .zip files to the S3 bucket you created in step 2.

7. Open the [AWS CloudFormation console](https://console.aws.amazon.com/cloudformation). Create a stack with new resources (standard).

8. Choose an existing template and upload a template file. Select the `cdk.out/C3AmazonConnect**Stack.template.json` file from your project. After uploading, hit next.

9. Set your stack name to `C3AmazonConnect${label}Stack` where `label` is the value you set in your `cdk.context.json` file. For example, if your label is `prod`, your stack name should be `C3AmazonConnectProdStack`. Hit next.

10. Nothing needs to be changed on the _Configure stack options_ page. Hit next.

11. Review that everything looks correct and check the box to _Acknowledge that AWS CloudFormation might create IAM resources._ Hit submit to create the stack.

12. Wait until all resources are created.

With the stack created, you can return to the [provide secret values](./GETTING-STARTED.md#provide-secret-values) section to finish setting up your Amazon Connect instance.
