import { expect, test } from "bun:test";
import {
  type FetchLike,
  resolvePermanentSourceUrl,
  resolvePermanentSourceUrls,
} from "./source-links";

function response(url: string, status = 200, contentType = "text/html") {
  return {
    ok: status >= 200 && status < 300,
    url,
    headers: new Headers({ "content-type": contentType }),
  } as Response;
}

test("resolvePermanentSourceUrl keeps a redirected article permalink", async () => {
  const fetcher: FetchLike = async () =>
    response("https://publisher.example/articles/story");

  await expect(
    resolvePermanentSourceUrl("https://short.example/story", fetcher),
  ).resolves.toBe("https://publisher.example/articles/story");
});

test("resolvePermanentSourceUrl rejects dead, soft-404, and non-article responses", async () => {
  const notFound: FetchLike = async () => response("https://publisher.example/gone", 404);
  const soft404: FetchLike = async () => response("https://publisher.example/404");
  const image: FetchLike = async () =>
    response("https://publisher.example/image.png", 200, "image/png");

  await expect(
    resolvePermanentSourceUrl("https://example.com/a", notFound),
  ).resolves.toBeNull();
  await expect(
    resolvePermanentSourceUrl("https://example.com/b", soft404),
  ).resolves.toBeNull();
  await expect(
    resolvePermanentSourceUrl("https://example.com/c", image),
  ).resolves.toBeNull();
});

test("resolvePermanentSourceUrls deduplicates input URLs", async () => {
  let calls = 0;
  const fetcher: FetchLike = async (url) => {
    calls++;
    return response(url);
  };

  const resolved = await resolvePermanentSourceUrls(
    [
      "https://publisher.example/a",
      "https://publisher.example/a",
      "https://publisher.example/b",
    ],
    fetcher,
  );

  expect(calls).toBe(2);
  expect(resolved.get("https://publisher.example/a")).toBe("https://publisher.example/a");
  expect(resolved.get("https://publisher.example/b")).toBe("https://publisher.example/b");
});
