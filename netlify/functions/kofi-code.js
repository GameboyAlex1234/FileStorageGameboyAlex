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

    const purchasedItem =
      data.shop_items?.[0]?.name ||
      data.shop_items?.[0]?.direct_link_code ||
      data.shop_item ||
      data.product_name;

    if (!purchasedItem) {
      console.log("KOFI PAYLOAD:", JSON.stringify(data, null, 2));
      return { statusCode: 400, body: "No purchased item found" };
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
      range: "A2:E",
    });

    const rows = result.data.values || [];

    const index = rows.findIndex((row) => {
      const item = row[0];
      const code = row[1];
      const used = row[2];

      return (
        item === purchasedItem &&
        code &&
        String(used).toUpperCase() !== "YES"
      );
    });

    if (index === -1) {
      return {
        statusCode: 200,
        body: `No unused codes left for ${purchasedItem}`,
      };
    }

    const rowNumber = index + 2;
    const code = rows[index][1];

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `C${rowNumber}:E${rowNumber}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [["YES", buyerEmail, new Date().toISOString()]],
      },
    });

    const emailResult = await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: buyerEmail,
      subject: `Your ${purchasedItem} code`,
      text: `Thanks for your purchase!

You bought: ${purchasedItem}

Your unique code is:

${code}`,
    });

    console.log("EMAIL RESULT:", JSON.stringify(emailResult, null, 2));

    return {
      statusCode: 200,
      body: `Code sent for ${purchasedItem}`,
    };
  } catch (error) {
    console.error("ERROR:", error);

    return {
      statusCode: 500,
      body: `Server error: ${error.message}`,
    };
  }
};
