const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

exports.handler = async (event) => {
  console.log("FUNCTION HIT");
  console.log("METHOD:", event.httpMethod);
  console.log("RAW BODY:", event.body);

  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 200,
        body: "Ko-fi webhook is live. Waiting for POST.",
      };
    }

    const params = new URLSearchParams(event.body);
    const rawData = params.get("data");

    if (!rawData) {
      return { statusCode: 400, body: "Missing Ko-fi data" };
    }

    const data = JSON.parse(rawData);

    const buyerEmail = data.email || data.from_email;
    const itemId = data.shop_items?.[0]?.direct_link_code;

    await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: buyerEmail,
      subject: "Ko-fi item ID debug",
      text: `Item ID: ${itemId}

Full item data:
${JSON.stringify(data.shop_items, null, 2)}`,
    });

    return {
      statusCode: 200,
      body: "Debug email sent",
    };
  } catch (error) {
    console.error("ERROR:", error);

    return {
      statusCode: 500,
      body: `Server error: ${error.message}`,
    };
  }
};
