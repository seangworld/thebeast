export const seangworldAdSensePublisherId = "pub-9840739735056649";

export const seangworldAdsTxtEntry =
  `google.com, ${seangworldAdSensePublisherId}, DIRECT, f08c47fec0942fa0`;

export const seangworldAdsTxtBody = `${seangworldAdsTxtEntry}\n`;

export function createSeangworldAdsTxtResponse() {
  return new Response(seangworldAdsTxtBody, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
