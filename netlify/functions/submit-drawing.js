const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

exports.handler = async (event) => {
  try {
    const { username, title, description, image } = JSON.parse(event.body);

    const base64Image = image.replace(/^data:image\/png;base64,/, "");

    await resend.emails.send({
      from: "Drawing Site <onboarding@resend.dev>",
      to: "gameboyalex1234@gmail.com",
      subject: `New Drawing Submission${title ? ": " + title : ""}`,
      html: `
        <h2>New Drawing Submission</h2>
        <p><strong>Username:</strong> ${escapeHtml(username)}</p>
        <p><strong>Title:</strong> ${escapeHtml(title)}</p>
        <p><strong>Description:</strong></p>
        <p>${escapeHtml(description).replaceAll("\n", "<br>")}</p>
      `,
      attachments: [
        {
          filename: "drawing.png",
          content: base64Image
        }
      ]
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
