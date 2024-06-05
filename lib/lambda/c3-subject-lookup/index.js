/*
	This is a basic template to use for subject lookup. Use this as a starting point to
	develop your own Lambda function to get the information about the subject (invoice number,
	account number, etc.) from your system.

	Do not change the inputs (event parameters) or outputs (return JSON) of this Lambda function. You
	may add more properties to the return JSON if needed.

	When your code is completed, remember to save or commit it for future deployments. If your
	code is not present when you do a future deployment, your Lambda will be overwritten with the empty
	template!
*/

/**
 * @type {import ('aws-lambda').Handler}
 */
export async function handler(event) {
	console.log(`EVENT: ${JSON.stringify(event)}`);

	// Get the parameters.
	const parameters = event.Details.Parameters;
	if (!parameters) {
		throw new Error('Parameters not found.');
	}
	if (!parameters.SubjectId) {
		throw new Error('SubjectId parameter not found.');
	}

	// Get the subject information.
	const subjectInfo = await getSubjectInfo(parameters.SubjectId);

	return {
		...subjectInfo,
		/*
		 You can add more properties here if needed. For example, if you want to re-use this Lambda for
		 use in a self-service payment IVR flow.
		*/
	};
}

/**
 * Gets the information about the subject.
 *
 * @param {string} subjectId The ID of the subject (invoice number, account number, etc.).
 * @returns {Promise<{
 *   ContactName: string,
 *   PaymentAmountDue: number,
 *   PaymentMinimumPayment: number,
 *   SubjectId: string,
 *   Email: string}>
 * } The subject information.
 */
async function getSubjectInfo(subjectId) {
	/*
		<<<< Add your own code here to get the subject information from your system. >>>>
	*/

	return {
		ContactName: 'John Doe',
		PaymentAmountDue: 100,
		PaymentMinimumPayment: 20,
		SubjectId: subjectId,
		Email: 'johndoe@email.com',
	};
}
