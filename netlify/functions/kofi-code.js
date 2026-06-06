const { google } = require("googleapis");
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

exports.handler = async (event) => {
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

    if (data.verification_token !== process.env.KOFI_VERIFICATION_TOKEN) {
      return { statusCode: 403, body: "Invalid Ko-fi token" };
    }

    const buyerEmail = data.email || data.from_email;

    if (!buyerEmail) {
      return { statusCode: 400, body: "No buyer email found" };
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "A2:D",
    });

    const rows = result.data.values || [];

    const index = rows.findIndex((row) => {
      return row[0] && String(row[1]).toUpperCase() !== "YES";
    });

    if (index === -1) {
      return { statusCode: 200, body: "No unused codes left" };
    }

    const rowNumber = index + 2;
    const code = rows[index][0];

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `B${rowNumber}:D${rowNumber}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [["YES", buyerEmail, new Date().toISOString()]],
      },
    });

    await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: buyerEmail,
      subject: "Your code",
      text: `Thanks for your purchase!\n\nYour code is: ${code}`,
    });

    return {
      statusCode: 200,
      body: "Code sent successfully",
    };
  } catch (error) {
    console.error("ERROR:", error);

    return {
      statusCode: 500,
      body: `Server error: ${error.message}`,
    };
  }
};
