# Self-Service Payment IVR

## Overview

The self-service payment IVR feature allows customers to make payments over the phone without the need to speak with an agent. This feature is ideal for organizations that want to provide a self-service payment option to their customers, reducing the need for agents to handle payment transactions.

## Configuration

> [!NOTE]
> Before continuing, ensure that you have set the `"selfServiceIVR"` attribute to true in the `cdk.context.json` file and deployed the stack.

Self-service payment collection is facilitated through the use of a Amazon Connect _flow module_ that is deployed to your instance. This flow module is responsible for the main payment collection piece of your self-service payment IVR. How you configure the rest of your IVR is up to you, but we'll walk you through the basic setup in this guide.

### Create Inbound Flow

You'll need to create a _contact_ flow that will greet your customers and guide them through the payment process. This flow can be set up however you would like, but it should generally follow the steps below:

![Simple example of an Amazon Connect flow. Displays a linear chain of the following blocks: Entry, Play prompt (Welcome), Store customer input (Prompt for Invoice Number), Invoke AWS Lambda function (Get Invoice Details), Set contact attributes (Record Details from Invoice), Invoke module (Invoke Self-Service IVR), Play prompt (Thank You), End flow / Resume](../images/self-service-payment-ivr-example.png 'Example Amazon Connect flow for self-service payment IVR')

1. **Give welcome message**

   Start with a simple welcome message that greets the customer and informs them that they can make a payment using the IVR.

2. **Get information**

   This will vary depending on your organization's needs, but you may want to collect the customer's account number, invoice number, or some other identifier. This identifier can be used to look up the customer's payment information using an _Invoke AWS Lambda function_ block within your flow.

   See the next step for the information that is required to process a payment.

3. **Set contact attributes**

   With the information retrieved, you will need to set the contact attributes that will be used by the self-service payment IVR flow module. Use a _Set contact attributes_ block to set the following contact attributes:

   - `ContactName`: The name of the customer making the payment.
   - `PaymentAmountDue`: The total amount due for this account, invoice, etc.
   - `PaymentMinimumPayment`: The minimum payment that is allowed for this account, invoice, etc. **Optional**: If left blank, the customer will be required to pay the full amount due.
   - `SubjectId`: The ID of the subject that the payment is being made for. This could be an account number, invoice number, etc.
   - `Email`: An email address for the customer. **Optional**: If provided, a receipt will be sent to this email address after the payment is completed.

4. **Invoke the self-service payment IVR flow module**

   Now, you will need to invoke the self-service payment IVR flow module that was deployed to your instance. After the _Set contact attributes_ block, add an _Invoke module_ block that invokes the **C3 IVR Payment Flow Module** flow module. This module will handle all the required steps in collecting the customer's payment information and return them back to your flow. Be sure to handle the success and failure paths accordingly.

5. **Provide additional options and end call**

   After the payment has been processed, you may want to provide the customer with additional options such as transferring to an agent, making another payment, or ending the call.

Ensure that your flow is saved and published before proceeding to the next step.

### Define Flow Entry Point

With the flow created, you'll need to define the entry point for your self-service payment IVR. This can be done in a couple of ways:

1. **Run the flow when a phone number is dialed**

   You can set up a _contact flow_ to be triggered when one of your registered phone numbers is dialed. See the [Amazon Connect documentation](https://docs.aws.amazon.com/connect/latest/adminguide/associate-claimed-ported-phone-number-to-flow.html) for more information on how to associate a phone number with a contact flow.

2. **Run the flow from another flow**

   You might want to run your self-service payment IVR flow from another contact flow, such as a main menu flow. In this case, you can use an _Transfer to flow_ block to start the self-service payment IVR flow.
