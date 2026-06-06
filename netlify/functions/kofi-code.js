const { google } = require("googleapis");
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

    console.log("RAW DATA:", rawData);

    if (!rawData) {
      return { statusCode: 400, body: "Missing Ko-fi data" };
    }

    const data = JSON.parse(rawData);

    console.log("KOFI PAYLOAD:", JSON.stringify(data, null, 2));

    return {
      statusCode: 200,
      body: "Debug received",
    };
  } catch (error) {
    console.error("ERROR:", error);

    return {
      statusCode: 500,
      body: `Server error: ${error.message}`,
    };
  }
};
