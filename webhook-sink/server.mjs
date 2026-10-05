import { createServer } from "node:http";

createServer(async (req, res) => {
  let body = "";
  for await (const chunk of req) body += chunk;
  console.log(
    JSON.stringify({
      method: req.method,
      url: req.url,
      headers: req.headers,
      body,
    }),
  );
  res.writeHead(204).end();
}).listen(8080);
