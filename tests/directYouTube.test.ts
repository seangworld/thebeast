import assert from "node:assert/strict";
import test from "node:test";
import { privateYouTubeMetadata, uploadPrivateYouTubeVideo, verifySeangworldChannel, youtubeAuthorization, youtubeConfiguration, youtubeToken, YOUTUBE_CALLBACK, YOUTUBE_SCOPES } from "../src/lib/server/directYouTube";
const env: NodeJS.ProcessEnv = { NODE_ENV: "test", YOUTUBE_GOOGLE_CLIENT_ID: "youtube-client", YOUTUBE_GOOGLE_CLIENT_SECRET: "test-secret", GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY: "aa".repeat(32) };
const channelId = `UC${"a".repeat(22)}`;
test("YouTube configuration is separate from AdSense and checks encryption readiness", () => {
  assert.equal(youtubeConfiguration({ NODE_ENV: "test", GOOGLE_CLIENT_ID: "old", GOOGLE_CLIENT_SECRET: "old" }).configured, false);
  assert.equal(youtubeConfiguration({ ...env, GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY: "bad" }).configured, false);
  assert.equal(youtubeConfiguration(env).configured, true);
});
test("authorization binds random state to owner and requests only explicit scopes with PKCE", () => {
  const a = youtubeAuthorization("owner-a", env), b = youtubeAuthorization("owner-a", env);
  assert.notEqual(a.state, b.state); assert.notEqual(a.verifier, b.verifier);
  const url = new URL(a.url);
  assert.equal(url.origin, "https://accounts.google.com");
  assert.equal(url.searchParams.get("redirect_uri"), YOUTUBE_CALLBACK);
  assert.equal(url.searchParams.get("scope"), YOUTUBE_SCOPES.join(" "));
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(a.state, `owner-a:${url.searchParams.get("state")}`);
  assert.equal(url.searchParams.has("include_granted_scopes"), false);
  assert.equal(url.searchParams.has("client_secret"), false);
});
test("channel resolution verifies exact mine and handle identity, not channel title", async () => {
  const requests: string[] = [];
  const channel = await verifySeangworldChannel("token", async (url) => { requests.push(String(url)); return Response.json({ items: [{ id: channelId, snippet: { title: "SEANGWORLD" } }] }); });
  assert.equal(channel.id, channelId); assert.equal(channel.handle, "@seangworld");
  assert.ok(requests.some((url) => url.includes("mine=true"))); assert.ok(requests.some((url) => url.includes("forHandle=seangworld")));
  await assert.rejects(verifySeangworldChannel("token", async (url) => Response.json({ items: [{ id: String(url).includes("mine=true") ? channelId : `UC${"b".repeat(22)}`, snippet: { title: "SEANGWORLD" } }] })), /wrong_channel/);
});
test("missing, ambiguous, paginated or malformed channel responses fail closed", async () => {
  for (const response of [{ items: [] }, { items: [{ id: channelId, snippet: { title: "x" } }], nextPageToken: "more" }, { items: [{ id: "bad", snippet: { title: "x" } }] }, { items: [{ id: channelId, snippet: { title: "x" } }, { id: channelId, snippet: { title: "x" } }] }]) {
    await assert.rejects(verifySeangworldChannel("token", async () => Response.json(response)), /unavailable/);
  }
});
test("token exchange never surfaces Google's raw credential-bearing response", async () => {
  await assert.rejects(youtubeToken({ code: "x" }, env, async () => Response.json({ error: "secret-payload" }, { status: 400 })), (error: unknown) => error instanceof Error && !error.message.includes("secret-payload"));
});
test("private metadata requires explicit audience and synthetic disclosure and bounds UTF8 description", () => {
  const metadata = privateYouTubeMetadata("Short", "Description", false, true);
  assert.equal(metadata.status.privacyStatus, "private"); assert.equal(metadata.status.selfDeclaredMadeForKids, false); assert.equal(metadata.status.containsSyntheticMedia, true);
  for (const values of [["", "", false, false], ["<bad>", "", false, false], ["Valid", "😀".repeat(1300), false, false], ["Valid", "", undefined, true], ["Valid", "", true, undefined]]) assert.throws(() => privateYouTubeMetadata(...values as [unknown,unknown,unknown,unknown]));
});
test("upload is private with subscriber notifications disabled and never retries a failure", async () => {
  let calls = 0;
  const video = await uploadPrivateYouTubeVideo("token", new Blob(["video"], { type: "video/mp4" }), privateYouTubeMetadata("Short", "", false, true), async (url, init) => {
    calls++; assert.match(String(url), /notifySubscribers=false/); assert.equal(init?.redirect, "error");
    assert.match(await (init!.body as Blob).text(), /"privacyStatus":"private"/);
    return Response.json({ id: "abcdefghijk", status: { privacyStatus: "private" } });
  });
  assert.equal(video, "abcdefghijk"); assert.equal(calls, 1);
  calls = 0;
  await assert.rejects(uploadPrivateYouTubeVideo("token", new Blob(["video"], { type: "video/mp4" }), privateYouTubeMetadata("Short", "", false, true), async () => { calls++; throw new Error("timeout"); }));
  assert.equal(calls, 1);
});
test("upload rejects unexpected public receipt and unsupported media", async () => {
  const metadata = privateYouTubeMetadata("Short", "", false, false);
  await assert.rejects(uploadPrivateYouTubeVideo("token", new Blob(["video"], { type: "video/mp4" }), metadata, async () => Response.json({ id: "abcdefghijk", status: { privacyStatus: "public" } })), /unconfirmed/);
  await assert.rejects(uploadPrivateYouTubeVideo("token", new Blob(["video"], { type: "text/plain" }), metadata), /media_invalid/);
});
