exports.handler = async () => ({
  statusCode: 501,
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    message: "This Lambda is a placeholder. The working app runs locally with pnpm dev.",
  }),
});
