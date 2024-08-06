# Salesforce Integration

## Overview

C3 for Amazon connect can be used within Salesforce to provide agents with a seamless experience when handling customer interactions. The configuration process depends on how you have Amazon Connect integrated with your Salesforce instance. There are two integrations that are supported by this project:

1. **[Amazon Connect CTI Adapter](https://appexchange.salesforce.com/appxListingDetail?listingId=a0N3A00000EJH4yUAH)**: The Amazon Connect CTI Adapter allows for the Amazon Connect Contact Control Panel (CCP) to be embedded within Salesforce as the softphone for your agents.
2. **[Salesforce Service Cloud Voice](https://aws.amazon.com/partners/amazon-connect-and-salesforce/)**: This integration is a managed package that provides a pre-built integration between Salesforce and Amazon Connect. It allows you to use [Salesforce Omni-Channel](https://www.salesforce.com/service/digital-customer-engagement-platform/) with Amazon Connect as your voice provider using the omni-channel softphone interface.

## Installation

> [!NOTE]
> Before proceeding, ensure that you have the necessary permissions for both Salesforce and AWS. Admin permissions are recommended.

### Create Payment Request App

#### Find Your Workspace URL

When you deployed resources to your AWS account through this project, a unique URL was generated for your agent workspace. After running `npm run synth` or `npm run deploy`, you will see this URL output in the console. It will look something like:

```bash
🌐 Your C3 Payment Request app URL is:

https://some-vendor.call2action.link/agent-workspace?contactCenter=amazon&instanceId=some-guid&region=some-region&externalRoleArn=${Token[TOKEN.261]}&subjectLookup=required-editable&customEmbed=true
```

> [!TIP]
> You can also find this URL at any time by looking at the `exports/C3WorkspaceAppUrl.txt` file.

Replace the `${Token[TOKEN.261]}` value with the ARN of the IAM role that was created when you deployed the stack. Look in IAM for a role named "AmazonConnectExternalRole", copy the ARN, and replace the placeholder in the URL.

#### Create Visualforce Page

Navigate to the _Service Setup_ page in your Salesforce instance and navigate to Platform Tools > Custom Code > Visualforce Pages. You can also enter "visualforce" in the quick find to find this page. Select the "New" button to create a new Visualforce page.

Give your page a name and label, such as "Payment Request". This name will not be visible to your agents, so you can name it whatever you like. Ensure that the _Available for Lightning Experience, Experience Builder sites, and the mobile app_ checkbox is checked.

Replace the content of the _Visualforce Markup_ tab with the following code:

```html
<apex:page>
	<iframe
		src="{{ Your URL from the previous step }}"
		style="height: 100vh; width: 100%; border: none;"
	>
	</iframe>
</apex:page>
```

> [!IMPORTANT]
> Please note the `&customEmbed=true` query parameter at the end of the URL. This parameter is required for the workspace to function properly in Salesforce.

Save your Visualforce page.

#### Create App Page

While still in the _Service Setup_ page, navigate to User Interface > User Interface > App Manager. You can also enter "app manager" in the quick find to find this page. Find the app that your agents will be using. For example, this could be the _Service Console_ or _Sales Console_ app. Scroll to the far right of the table, click the dropdown arrow, and select "Edit".

At the top of this page, click the "Pages" dropdown and select "New Page". Choose "App Page" and hit next.

Give your page a name and label, such as "Payment Request". This name **will** be visible to your agents, so name it something that makes sense to them. Select the "One Region" layout and hit done.

In the _Lightning Page Builder_, drag a _Visualforce Page_ component onto the page. Configure the component to use the Visualforce page you created in the previous step by selecting it in the "Visualforce Page Name" input.

> [!TIP]
> Give your component more real estate by setting the height to something like 850 pixels and hiding the label.

Hit the save button. When prompted, select "Activate". Here, you can assign an icon to the app page. This icon will be visible to your agents in the Salesforce app switcher, so choose something recognizable like an icon of a money bag. Ensure that "Activate for all users".

On the "Lightning Experience" tab, select the lightning app that your agents will be using and select the "Add page to app" button. You might also want to change the order that this app page appears in the navigation items.

Optionally, you can repeat the same steps on the "Mobile Navigation" tab to add the app page to the mobile app. Once satisfied, hit the save button.

Your app page is now ready for use! Verify that your agents can see the new app page in their navigation items.

### Configure Amazon Connect Integration

This step will vary depending on how you have Amazon Connect integrated with Salesforce. Please follow the appropriate guide below:

#### CTI Adapter Configuration

#### Install CTI Adapter

In order to integrate Amazon Connect into your Salesforce Lightning instance, you will need to install the Amazon Connect CTI Adapter. This adapter will allow you to connect your Amazon Connect instance to Salesforce and provide your agents with the ability to make and receive calls with the CCP interface within Salesforce.

For detailed instructions on how to install the CTI Adapter, please reference the [Amazon Connect CTI Adapter Installation Guide](https://amazon-connect.github.io/amazon-connect-salesforce-cti/docs/lightning/installation/01-installation).

> [!IMPORTANT]
> Please follow the directions closely. The CTI Adapter requires a number of configuration steps to be completed in order to function properly.

##### Enable CCP Softphone

Navigate back to the App Manager in the Salesforce _Service Setup_ page. Find the app that your agents will be using. As before, examples could be the _Service Console_ or _Sales Console_ app. Scroll to the far right of the table, click the dropdown arrow, and select "Edit".

Select the "Utility Items" tab and click the "Add Utility Item" button. Search for the "Open CTI Softphone" utility item and select it. Give this a label and icon that are recognizable to your agents, such as "Phone" and a phone icon. Configure the other properties as needed and hit save.

Verify that your agents can see the new softphone option in their utility items at the bottom of the screen.

##### Enable Attribute Display in the CCP Softphone

Because the "Payment Request" app cannot directly communicate with Amazon Connect when embedded in Salesforce, agents will need to pass some necessary information from Salesforce to the Payment Request app. To display this information to the agent in the CCP interface, you will need to modify the CTI adapter that you installed.

Open the _App Launcher_ in Salesforce and search for "AC CTI Adapters" item. Open it and select your CTI adapter. Ensure the "Softphone Popout Enabled" option is checked.

At the bottom of the page, find the "Attributes" section and hit "New". Add a new attribute with the following properties:

![Screenshot of a dialogue screen in Salesforce named "New AC CTI Attribute". Properties are populated with values required for the integration.](../images/salesforce-new-attribute.png 'Contact ID CTI Attribute')

#### Set the Contact ID Attribute in Amazon Connect Flow

In your initial contact flow, you will need to set the `ContactId` contact attribute _before_ you transfer the call to a queue. This attribute will be used by the Salesforce CTI adapter to display the contact ID in the CCP interface.

Use the following flow as an example:

![Image of a contact flow in Amazon Connect. A "Set contact attributes" block is defined, followed by a "Set working queue", and finally "Transfer to queue" block.](../images/initial-contact-flow.png 'Sample initial contact flow')

Within the _Set contact attributes_ block, configure the following settings:

- **Set attributes on**: Current contact
- **Key (Top)**: User defined - `ContactId`
- **Key (Bottom)**: Set dynamically - System - Initial Contact id

Save the changes to your block, then save and publish your contact flow.

#### Service Cloud Voice Configuration

#### Install Service Cloud Voice

Follow the steps in the [Service Cloud Voice guide](https://help.salesforce.com/s/articleView?id=sf.voice_setup_enable.htm&type=5) to get set up with Service Cloud Voice. This will provision an AWS account and Amazon Connect instance for you.

#### Configure Omni-Channel

Ensure that the _Payment IVR_ (and _Subject Lookup_) quick connects are displaying in the Salesforce Omni-Channel widget.

## Test the Integration

Test the entire integration by making a call to your Amazon Connect inbound number and attempting to collect a payment through the app.

For more information on how to use C3 for Amazon Connect, please refer to the [agent user manual](https://customerdynamics.stonly.com/kb/guide/en/c3-for-amazon-connect-4aD1PSTbrN/Steps/3598750).
