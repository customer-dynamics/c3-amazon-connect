# Subject Lookup

## Overview

Subject lookup is an additional feature that can be enabled for agent-assisted payments. It allows the agent to search for details about a subject (customer, invoice, etc.) in order to pre-fill the payment form with the subject's details without ever leaving the agent workspace interface. This can help to reduce the time it takes to process a payment and reduce the likelihood of errors.

## Modes

There are three modes currently supported for looking up subject information:

1. **Required Fixed**: The agent is _required_ to look up the subject information before proceeding with the payment. Once the info is found, the details _cannot_ be changed by the agent.
2. **Required Editable**: The agent is _required_ to look up the system information before proceeding with the payment. Once the info is found, the details are pre-filled in the payment form, but _can_ be changed by the agent afterwards.
3. **Optional Editable**: The agent can _choose_ to look up the subject information, but it is not required. If subject information is looked up, the details are pre-filled in the payment form and _can_ be changed by the agent afterwards.

## Configuration

> [!NOTE]
> Before continuing, ensure that you have set the `"subjectLookup"` attribute in the `cdk.context.json` file and deployed the stack.

Agent lookup is facilitated through the use of a _quick connect_, _transfer to queue flow_, _queue_ and _Lambda function_. These resources will be deployed automatically for you when you enable the subject lookup feature. Because the lookup is specific to your organization's needs, you will need to configure the lookup process within the Lambda function.

### Update Lambda Function

asdf

### Update Queue

To enable your agent to look up subject information, you will need to update the queue that your agents are working in to enable the _Subject Lookup_ quick connect. Reference the _Enable agents to see quick connects_ step in the [Amazon Connect documentation](https://docs.aws.amazon.com/connect/latest/adminguide/quick-connects.html#step2-enable-agents-to-see-quick-connects) to enable the _Subject Lookup_ quick connect.

Once configured, your agents should see a _Subject Lookup_ quick connect in the _Quick connects_ dropdown in the CCP interface. Note that this quick connect will only be present while the agent is on a call.

![Screenshot of the Amazon Connect agent workspace interface. The quick connects dropdown in the bottom left is expanded showing a quick connect called "Payment IVR"](../images/agent-workspace-quick-connects.png 'Amazon Connect Quick Connects')