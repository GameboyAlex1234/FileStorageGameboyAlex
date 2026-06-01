const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

exports.handler = async (event) => {
  try {
    const { image } = JSON.parse(event.body);

    const base64Image = image.replace(/^data:image\/png;base64,/, "");

    await resend.emails.send({
      from: "Drawing Site <onboarding@resend.dev>",
      to: "gameboyalex1234@gmail.com",
      subject: "New Drawing Submission",
      html: "<p>Someone submitted a drawing.</p>",
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
