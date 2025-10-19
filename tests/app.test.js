import { app } from "../src/app.js";
import http from "http";

const request = (opts, body) =>
  new Promise((resolve) => {
    const req = http.request({ host: "127.0.0.1", port: 0, ...opts }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ res, data }));
    });
    if (body) req.write(body);
    req.end();
  });

let server, port;

beforeAll((done) => {
  server = app.listen(0, () => {
    port = server.address().port;
    done();
  });
});

afterAll((done) => server.close(done));

test("GET /health returns ok", async () => {
  const { res, data } = await request({ method: "GET", path: "/health", port });
  expect(res.statusCode).toBe(200);
  expect(JSON.parse(data)).toEqual({ ok: true });
});

test("POST /posts rejects invalid title (too short)", async () => {
  const { res } = await request(
    { method: "POST", path: "/posts", port },
    JSON.stringify({ title: "x" })
  );
  expect(res.statusCode).toBe(400);
});

test("POST /posts sanitizes title to prevent XSS", async () => {
  const payload = { title: "<img onerror=alert(1)>" };
  const { res, data } = await request(
    { method: "POST", path: "/posts", port },
    JSON.stringify(payload)
  );
  expect(res.statusCode).toBe(201);
  const body = JSON.parse(data);
  expect(body.title.includes("<")).toBe(false);
  expect(body.title).toBe("img onerror=alert(1)");
});

test("POST /posts handles invalid JSON safely", async () => {
  const { res } = await request(
    { method: "POST", path: "/posts", port },
    "{not-json"
  );
  expect(res.statusCode).toBe(400);
});

test("GET unknown route returns 404", async () => {
  const { res } = await request({ method: "GET", path: "/nope", port });
  expect(res.statusCode).toBe(404);
});

test("POST /posts accepts valid title", async () => {
  const { res, data } = await request(
    { method: "POST", path: "/posts", port },
    JSON.stringify({ title: "Hello world" })
  );
  expect(res.statusCode).toBe(201);
  const body = JSON.parse(data);
  expect(body.title).toBe("Hello world");
});
