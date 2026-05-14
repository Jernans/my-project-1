export function buildWhatsAppSubject(phone) {
  return `Unable to Login to WhatsApp Account - ${phone}`;
}

export function buildWhatsAppBody(phone) {
  return `Hello WhatsApp Support,

I am experiencing a problem logging into my WhatsApp account. When I try to log in, I receive the following message:

"Login not available right now"

I would like to inform you that:

- My phone number is still active and accessible
- The SIM card is currently inserted in this device
- I am the legitimate owner of this phone number

I did not engage in any suspicious activity, but suddenly I am unable to access my WhatsApp account. I kindly request your assistance in reviewing and restoring access to my account.

Here are my account details:

WhatsApp Number: ${phone}

Thank you for your time and support.`;
}
