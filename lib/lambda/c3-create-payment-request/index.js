import axios from "axios";

export async function handler(event) {
  console.log(`EVENT: ${JSON.stringify(event)}`);

  const paymentOptions = {
    amountDue: '',
    agingInfo: '',
    minimumPayment: '0',
  };

  const paymentRequestBody = {
    vendorId: '{{vendor}}', // Your vendor ID
    subjectId: 'f4ca7c5e-1a53-428d-992b-0d2f76efc062', // The ID in the external system for the contact making the payment
    agentId: '654126', // The agent ID for CXone
    contactName: 'John Doe', // The name of the contact making the payment
    ttl: 3600, // The number of milliseconds until the payment link expires
    logoUrl:
      'https://media-exp1.licdn.com/dms/image/C560BAQE3qrk0lCwOhQ/company-logo_200_200/0?e=2159024400&v=beta&t=9C6UAdSij2VWg3zusUe-tGHdGogmmBXTzchCrhBBm5A',
    header1: 'Customer Dynamics',
    header2: 'Demo Action Request',
    primaryColor: '#0777BD',
    secondaryColor: '#FFFFFF',
    supportPhone: '+18015555555', // Displayed on receipt email
    supportEmail: 'support@customerdynamics.com', // Displayed on receipt email
    c2a: {
      payment: paymentOptions,
    },
  };

  try {
    const paymentRequestResponse = await axios.post('', paymentRequestBody, {
      headers: {
        'x-api-key': process.env.ENV.C3_API_KEY,
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify(paymentRequestResponse.data),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify(error),
    };
  }
}
