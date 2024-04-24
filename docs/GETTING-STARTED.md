# Getting Started

## Prerequisites

Before getting started with C3 for Amazon Connect, please ensure the following:

- You have a current C3 license
- You have an AWS account
- You have an Amazon Connect instance
- You have Node.js and npm installed on your machine

## Installation

### Create an Amazon Connect Flow Security Key

In order to ensure that sensitive payment information is encrypted in your environment, you will need to create a flow security key in your Amazon Connect instance. This key will be used to encrypt and decrypt sensitive data in your Amazon Connect flows.

To create a flow security key, please reference steps 1 and 2 of the [Amazon Connect documentation](https://aws.amazon.com/blogs/contact-center/creating-a-secure-ivr-solution-with-amazon-connect/#step1). Once you have created the key, make note of the key ID. Keep the certificate, private key, and public key in a safe place, as you will need them later in the deployment process.

> **Note:** Be aware of the expiration date on the certificate you generated. Once this expires, values cannot be encrypted or decrypted and your payment flows will fail. It is recommended that you set a reminder to renew the certificate before it expires. Once renewed, you will need to update the security key in your Amazon Connect instance and repeat the process outlined in this document to deploy updated resources.

### Deploy Resources Using the AWS CDK

To reduce the need for manually importing resources, C3 for Amazon Connect uses the AWS Cloud Development Kit (CDK) to deploy the necessary resources directly to your AWS account in a newly created stack.

In order to facilitate this process, you will need to provide some values to the CDK. All of the following values will need to be defined in the `cdk.context.json` file:

| Value                                        | Description                                                                                                                                                                                                                                                           |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `amazonConnectInstanceArn`                   | The full ARN of your Amazon Connect Instance.                                                                                                                                                                                                                         |
| `amazonConnectSecurityKeyId`                 | The ID the security key that you configured for your Amazon Connect instance.                                                                                                                                                                                         |
| `amazonConnectSecurityKeyCertificateContent` | The full content of the certificate associated with your Amazon Connect security key. Begins with `-----BEGIN CERTIFICATE-----` and ends with`-----END CERTIFICATE-----`. Please note, this must be contained within a single string with newlines denoted with `\n`. |
| `c3Env`                                      | The C3 environment to be used. Valid options are `"prod"`, `"staging"`, and `"dev"`.                                                                                                                                                                                  |
| `c3ApiKey`                                   | The C3 API key issued to your vendor.                                                                                                                                                                                                                                 |
| `c3VendorId`                                 | The C3 ID identifying your vendor.                                                                                                                                                                                                                                    |
| `c3PaymentGateway`                           | The payment gateway used for your vendor. Currently, only `"zift"` is supported.                                                                                                                                                                                      |
| `logoUrl`                                    | An public image URL to be used as the logo for your company. This will be displayed in the receipt email sent to customers.                                                                                                                                           |
| `supportPhone`                               | The phone number to which customers can call for inquiries. This will be displayed in the receipt email sent to customers.                                                                                                                                            |
| `supportEmail`                               | The email address to which customers can send inquiries. This will be displayed in the receipt email sent to customers.                                                                                                                                               |

Once these values are provided, ensure that you have the AWS CDK installed and configured on your machine. Please reference the [Getting started with the AWS CDK](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html) documentation for more information.

With the CDK installed and configured, install the necessary dependencies:

```bash
npm i
```

Build the project:

```bash
npm run build
```

Bootstrap the CDK:

```bash
cdk bootstrap
```

This command will deploy the necessary resources to your AWS account to facilitate the deployment of the C3 stack. This only needs to be done once per AWS account.

Then deploy the stack to the same region as your Amazon Connect instance:

```bash
cdk deploy
```

> [!NOTE]
> This command will deploy to the region specified in the default profile for your AWS CLI configuration. If you would like to deploy to a different profile, you can specify the profile using the `--profile` flag.

### Setting Up Your Flows

Once the stack has been deployed, you will need to configure your Amazon Connect flows to utilize the resources that have been deployed. The following steps will guide you through the process of setting up your flows
