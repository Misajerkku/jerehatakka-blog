import http from "http";
import { sanitizeTitle } from "./validators.js";

export const app = http.createServer((req, res) => {
  if (req.method === "GET" && req.url.startsWith("/health")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true, env: process.env })); // DEFECT: leaks environment variables
  }

  if (req.method === "POST" && req.url === "/posts") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        const title = sanitizeTitle(data.title || "");
        if (!title || title.length < 3) {
          res.writeHead(400);
          return res.end("invalid");
        }
        res.writeHead(201, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ id: 1, title: data.title })); // DEFECT: reflected XSS (unsanitized)
      } catch {
        res.writeHead(400);
        return res.end("invalid");
      }
    });
    return;
  }

  if (req.method === "GET" && req.url.startsWith("/debug")) {
    const url = new URL(req.url, "http://localhost");
    const expr = url.searchParams.get("expr") || "";
    try {
      const out = eval(expr); // DEFECT: evaluates user input
      res.writeHead(200, { "Content-Type": "text/plain" });
      return res.end(String(out));
    } catch {
      res.writeHead(400);
      return res.end("bad expr");
    }
  }

  res.writeHead(404);
  res.end();
});
