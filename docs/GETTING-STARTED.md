# Getting Started

## Prerequisites

Before getting started with C3 for Amazon Connect, please ensure the following:

- You have a current C3 vendor account
- You have an AWS account
- You have an Amazon Connect instance
- You have Node.js (v20+) and npm (v10+) installed on your machine
- You have [installed and configured the AWS CDK](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html#getting_started_auth) on your machine

## Installation

### Create an Amazon Connect Flow Security Key

In order to ensure that sensitive payment information is encrypted in your environment, you will need to create a flow security key in your Amazon Connect instance. This key will be used to encrypt and decrypt sensitive data in your Amazon Connect flows.

To create a flow security key, please reference steps 1 and 2 of the [Amazon Connect documentation](https://aws.amazon.com/blogs/contact-center/creating-a-secure-ivr-solution-with-amazon-connect/#step1). Once you have created the key, make note of the key ID. Keep the certificate, private key, and public key in a safe place, as you will need them later in the deployment process.

> [!NOTE]
> Be aware of the expiration date on the certificate you generated. Once this expires, values cannot be encrypted or decrypted and your payment flows will fail. It is recommended that you set a reminder to renew the certificate before it expires. Once renewed, you will need to update the security key in your Amazon Connect instance and repeat the process outlined in this document to deploy updated resources.

### Clone the Repository

Begin by cloning the C3 for Amazon Connect repository to your local machine:

```bash
git clone git@github.com:customer-dynamics/c3-amazon-connect.git
```

> [!TIP]
> If you prefer, you can also download the latest source code as a .zip from the [releases page](https://github.com/customer-dynamics/c3-amazon-connect/releases) and extract it to your local machine.

Once cloned, open the project in your preferred code editor.

### Deploy Resources Using the AWS CDK

To reduce the need for manually importing resources, C3 for Amazon Connect uses the AWS Cloud Development Kit (CDK) to deploy the necessary resources directly to your AWS account in a newly created stack.

In order to facilitate this process, you will need to provide some values to the CDK. All of the following configuration values will need to be defined in the `cdk.context.json` file:

#### Configuration Values

| Value        | Description                                                                                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `stackLabel` | **Optional**. A unique label to give to the deployed stack. To enable multiple stacks to be deployed to a single AWS account, this field must be populated with a unique name. |

##### Amazon Connect

| Value                           | Description                                                                                                                                                                                                                                                                                              |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `instanceArn`                   | The full ARN of your Amazon Connect Instance. You can find this in the AWS console and it should look something like `"arn:aws:connect:us-west-2:815407490078:instance/5c1f1fba-d5f1-4155-9e09-496456e58912"`.                                                                                           |
| `securityKeyId`                 | The ID of the security key that you configured for your Amazon Connect instance. You can find this in the AWS console.                                                                                                                                                                                   |
| `securityKeyCertificateContent` | The full content of the certificate associated with your Amazon Connect security key. Begins with `-----BEGIN CERTIFICATE-----` and ends with`-----END CERTIFICATE-----`. **Note**: This must be contained within a single string with newlines denoted with `\\n`.                                      |
| `workspaceApp`                  | Whether to create the C3 Payment Request app for the Amazon Connect agent workspace. Defaults to `true`. You may want to set this to `false` if you plan to use the workspace through another interface, like Salesforce. **Note**: This option does nothing if no agent-assisted features are selected. |

##### C3

| Value            | Description                                                                          |
| ---------------- | ------------------------------------------------------------------------------------ |
| `env`            | The C3 environment to be used. Valid options are `"prod"`, `"staging"`, and `"dev"`. |
| `vendorId`       | The C3 ID identifying your vendor.                                                   |
| `paymentGateway` | The payment gateway used for your vendor. Currently, only `"Zift"` is supported.     |

##### Features

| Value               | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agentAssistedIVR`  | Determines whether or not to deploy resources necessary to support the agent-assisted IVR feature. Defaults to `true`. If set to `false`, some resources will not be deployed, and agents will not have the ability to collect payments through an IVR.                                                                                                                                                                                                                                 |
| `agentAssistedLink` | **Currently unsupported**. This feature will be coming soon.                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `selfServiceIVR`    | Determines whether or not to deploy resources necessary to support a self-service payment IVR. Defaults to `true`. If set to `false`, some resources will not be deployed.<br><br>For more information, see the [self-service payment IVR](./features/SELF_SERVICE_PAYMENT_IVR.md) documentation.                                                                                                                                                                                       |
| `subjectLookup`     | **Optional**. Additional feature for agent-assisted IVR payments. If set, this will allow the agent to pull details about the subject to pre-fill information in the payment request (contact name, contact email, and amount due). Valid options are `"required-fixed"`, `"required-editable"`, and `"optional-editable"`. Leave blank if you don't want to support subject lookup.<br><br>For more information, see the [subject lookup](./features/SUBJECT_LOOKUP.md) documentation. |

##### Options

| Value         | Description                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------ |
| `codeSigning` | Whether to support code signing for Lambda resources. This is recommended for security purposes. |

##### Other

| Value          | Description                                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `logoUrl`      | A public image URL used for the logo representing your company. This will be displayed in the receipt email sent to customers. |
| `supportPhone` | The phone number customers can call for support. This will be displayed in the receipt email sent to customers.                |
| `supportEmail` | The email address customers can email for support. This will be displayed in the receipt email sent to customers.              |

Once these values are provided, deploy the stack to the same region as your Amazon Connect instance by running the following at the root of the project:

```bash
npm run deploy
```

> [!IMPORTANT]
> This command will deploy to the region specified in the default profile for your AWS CLI configuration. If you would like to deploy to a different profile, you can specify the profile using the `-- --profile your_profile_name` argument.

> [!TIP]
> If your deployment fails because of permission issues relating to the CDK, you can try the [alternative import method](./ALTERNATIVE_IMPORT.md) to deploy the stack.

### Provide Secret Values

Once deployed, C3 for Amazon Connect will have deployed a number of secrets to [AWS Secrets Manager](https://console.aws.amazon.com/secretsmanager/listsecrets). These secrets will need to be updated with the appropriate values in order to facilitate the operation of the C3 resources:

| Secret Name              | Description                                                                                                                                                             |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C3_PRIVATE_KEY           | The content of the private key that was used in the previous step when you generated the certificate. The content of this file can be copy-pasted into Secrets Manager. |
| C3_API_KEY               | The API key assigned to your C3 vendor.                                                                                                                                 |
| < GATEWAY >\_CREDENTIALS | The credentials to the account used for your payment gateway (Zift, etc.). Provide these as a key/value pair that includes `accountId`, `username`, and `password`.     |

### Configure Amazon Connect

You will also need to configure some items in your Amazon Connect instance to make C3 resources available for your agents.

#### Update Security Profile

> [!NOTE]
> If you are not collecting agent-assisted payments, you can skip this step.

To have the C3 Payment Request workspace available for your agents, you'll need to make sure the third-party app is enabled in the security profile that your agents are using. Please follow the steps outlined in the [Amazon Connect documentation](https://docs.aws.amazon.com/connect/latest/adminguide/assign-security-profile-3p-apps.html) to enable the third-party app in your security profile.

Once configured, your agents should see a _Payment Request_ app in the _Apps_ dropdown in the top right corner of the Amazon Connect agent workspace.

![Screenshot of the Amazon Connect agent workspace interface. The apps dropdown in the top right corner is expanded showing an application called "Payment Request"](./images/agent-workspace-apps.png 'Amazon Connect Apps')

#### Update Queue

> [!NOTE]
> If you are not collecting agent-assisted payments, you can skip this step.

To enable your agent to transfer a call to the C3 payment IVR, you will need to update the queue that your agents are working in to enable the _Payment IVR_ quick connect. Reference the _Enable agents to see quick connects_ step in the [Amazon Connect documentation](https://docs.aws.amazon.com/connect/latest/adminguide/quick-connects.html#step2-enable-agents-to-see-quick-connects) to enable the _Payment IVR_ quick connect.

Once configured, your agents should see a _Payment IVR_ quick connect in the _Quick connects_ dropdown in the CCP interface. Note that this quick connect will only be present while the agent is on a call.

![Screenshot of the Amazon Connect agent workspace interface. The quick connects dropdown in the bottom left is expanded showing a quick connect called "Payment IVR"](./images/payment-ivr-quick-connect.png 'Payment IVR quick connect')

#### Configure Additional Features

##### Self-Service Payment IVR

If you have enabled the self-service payment IVR feature, you will need to configure the necessary resources to support this feature. Please reference the [self-service payment IVR](./features/SELF_SERVICE_PAYMENT_IVR.md) documentation for more information.

##### Subject Lookup

If you have enabled the subject lookup feature, you will need to configure the necessary resources to support this feature. Please reference the [subject lookup](./features/SUBJECT_LOOKUP.md) documentation for more information.

##### Salesforce Integration

C3 for Amazon Connect can also be used within Salesforce to facilitate payments. Please reference the [Salesforce Integration](./features/SALESFORCE_INTEGRATION.md) documentation for more information.

## Next Steps

With the resources deployed and configured, you can now begin using the C3 Amazon Connect resources to provide a more seamless experience for your agents and customers.

For more information on how to use the features, please reference the [agent user manual](https://stonly.com/guide/en/c3-for-amazon-connect-4aD1PSTbrN/Steps/3598750).

### Test Cards and Bank Accounts

If your payment gateway is in sandbox mode, you can use specific dummy credit cards and bank accounts in order to test payments. Please reference the linked documentation for your payment gateway:

- [Zift](https://docs.zift.io/processing-api/terminal/integration)
