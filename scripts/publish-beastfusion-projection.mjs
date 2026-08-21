import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";

function fail(message) {
  process.stderr.write(`Projection publication refused: ${message}\n`);
  process.exitCode = 1;
}

const args = process.argv.slice(2);
const valueFor = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

const file = valueFor("--file");
const url = valueFor("--url");
const secret = process.env.BEASTFUSION_PROJECTION_PUBLISH_SECRET;

if (!file || !url || !secret || secret.length < 32) {
  fail("--file, --url, and a server-provided BEASTFUSION_PROJECTION_PUBLISH_SECRET of at least 32 characters are required.");
} else {
  try {
    const target = new URL(url);
    if (target.protocol !== "https:" && target.hostname !== "localhost" && target.hostname !== "127.0.0.1") {
      throw new Error("the publication URL must use HTTPS except for localhost");
    }
    const body = await readFile(file, "utf8");
    if (Buffer.byteLength(body, "utf8") > 1024 * 1024) throw new Error("the projection exceeds one megabyte");
    JSON.parse(body);
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
    const response = await fetch(target, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-beastfusion-timestamp": timestamp,
        "x-beastfusion-signature": signature,
      },
      body,
    });
    const result = await response.text();
    if (!response.ok) throw new Error(`endpoint returned ${response.status}: ${result.slice(0, 500)}`);
    process.stdout.write(`${result}\n`);
  } catch (error) {
    fail(error instanceof Error ? error.message : "unknown publication error");
  }
}
