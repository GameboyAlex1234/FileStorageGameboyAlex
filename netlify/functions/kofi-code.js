const { google } = require("googleapis");
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY2);

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);

    // Ko-fi usually sends JSON inside "data"
    const data = typeof body.data === "string" ? JSON.parse(body.data) : body;

    if (data.verification_token !== process.env.KOFI_VERIFICATION_TOKEN) {
      return { statusCode: 403, body: "Invalid token" };
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

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const range = "Codes!A2:D";

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = result.data.values || [];
    const index = rows.findIndex((row) => row[1] !== "YES");

    if (index === -1) {
      return { statusCode: 200, body: "No codes left" };
    }

    const rowNumber = index + 2;
    const code = rows[index][0];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Codes!B${rowNumber}:D${rowNumber}`,
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

    return { statusCode: 200, body: "Code sent" };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: "Server error" };
  }
};
