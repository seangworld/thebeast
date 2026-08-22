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
const audience = valueFor("--audience") || process.env.BEASTFUSION_OIDC_AUDIENCE;
const oidcRequestUrl = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
const oidcRequestToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;

if (!file || !url || !audience || !oidcRequestUrl || !oidcRequestToken) {
  fail("--file, --url, --audience, and the GitHub Actions OIDC request environment are required.");
} else {
  try {
    const target = new URL(url);
    if (target.protocol !== "https:" && target.hostname !== "localhost" && target.hostname !== "127.0.0.1") {
      throw new Error("the publication URL must use HTTPS except for localhost");
    }
    const body = await readFile(file, "utf8");
    if (Buffer.byteLength(body, "utf8") > 1024 * 1024) throw new Error("the projection exceeds one megabyte");
    JSON.parse(body);
    const tokenUrl = new URL(oidcRequestUrl);
    tokenUrl.searchParams.set("audience", audience);
    const tokenResponse = await fetch(tokenUrl, { headers: { authorization: `Bearer ${oidcRequestToken}` } });
    const tokenResult = await tokenResponse.json().catch(() => null);
    if (!tokenResponse.ok || !tokenResult?.value) throw new Error("GitHub Actions did not issue a workload identity token");
    const response = await fetch(target, {
      method: "POST",
      headers: {
        "content-type": "application/vnd.beastfusion.command-center+json;version=1",
        authorization: `Bearer ${tokenResult.value}`,
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
