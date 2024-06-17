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

Agent lookup is facilitated through the use of a _quick connect_, _transfer to queue flow_, _queue_, and _Lambda function_. These resources will be deployed automatically for you when you enable the subject lookup feature. Because the lookup is specific to your organization's needs, you will need to configure the lookup process within the Lambda function.

### Update Lambda Function

Because the subject lookup process is specific to your organization, you will need to provide your own code in the Lambda function that is deployed with the stack to handle the lookup process. This Lambda function is named `C3SubjectLookup` and you can find the code at `lib/lambda/c3-subject-lookup/index.js`. Please read the comments in the code to understand how to implement your own lookup process.

If you need to grant your Lambda function to access any of your other AWS resources, you can add them to the empty, commented-out policy in `lib/features/subject-lookup.ts`. Look for this comment:

```typescript
// Update this with any additional permissions that the function needs for your subject lookup.
// const subjectLookupPolicy = new PolicyStatement({
//   actions: [],
//   resources: [],
// });
// this.subjectLookupFunction.addToRolePolicy(subjectLookupPolicy);
```

Once you have updated the Lambda function, you can deploy the stack again to update the Lambda function:

```bash
npm run deploy
```

> [!NOTE]
> Remember to save or commit your code changes so that future deployments will always include your changes.

### Update Queue

To enable your agent to look up subject information, you will need to update the queue that your agents are working in to enable the _Subject Lookup_ quick connect. Reference the _Enable agents to see quick connects_ step in the [Amazon Connect documentation](https://docs.aws.amazon.com/connect/latest/adminguide/quick-connects.html#step2-enable-agents-to-see-quick-connects) to enable the _Subject Lookup_ quick connect.

Once configured, your agents should see a _Subject Lookup_ quick connect in the _Quick connects_ dropdown in the CCP interface. Note that this quick connect will only be present while the agent is on a call.

![Screenshot of the Amazon Connect agent workspace interface. The quick connects dropdown in the bottom left is expanded showing a quick connect called "Subject Lookup"](../images/subject-lookup-quick-connect.png 'Subject lookup quick connect')
