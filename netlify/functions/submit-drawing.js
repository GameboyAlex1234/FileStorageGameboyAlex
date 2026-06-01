exports.handler = async (event) => {
  const { image } = JSON.parse(event.body);

  console.log("PNG received:", image.slice(0, 100));

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true })
  };
};
