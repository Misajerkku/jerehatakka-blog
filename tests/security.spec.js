import http from "http";
import { isStrongPassword } from "../src/validators.js";
import { app } from "../src/app.js";

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
  process.env.SECRET = "TOP_SECRET_DO_NOT_LEAK";
  server = app.listen(0, () => {
    port = server.address().port;
    done();
  });
});

afterAll((done) => {
  delete process.env.SECRET;
  server.close(done);
});

test("XSS: POST /posts must sanitize title", async () => {
  const payload = { title: "<img src=x onerror=alert(1)>" };
  const { res, data } = await request(
    { method: "POST", path: "/posts", port },
    JSON.stringify(payload)
  );
  expect(res.statusCode).toBe(201);
  const body = JSON.parse(data);
  expect(body.title.includes("<")).toBe(false);
  expect(body.title.includes(">")).toBe(false);
});

test("Password policy: weak password isStrongPassword('Abc123') === false", () => {
  expect(isStrongPassword("Abc123")).toBe(false);
});

test("Info disclosure: /health must not include SECRET or env dump", async () => {
  const { res, data } = await request({ method: "GET", path: "/health", port });
  expect(res.statusCode).toBe(200);
  expect(data).not.toContain("TOP_SECRET_DO_NOT_LEAK");
  expect(data).not.toMatch(/"env"|process\.env/i);
});

test("RCE surface: GET /debug should not exist", async () => {
  const { res } = await request({
    method: "GET",
    path: "/debug?expr=1+2",
    port,
  });
  expect([404, 400]).toContain(res.statusCode);
});
