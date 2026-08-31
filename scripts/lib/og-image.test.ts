import { expect, test } from "bun:test";
import { type FetchLike, fetchOgImage, fetchOgImages } from "./og-image";

function response(url: string, html: string, status = 200, contentType = "text/html") {
  return {
    ok: status >= 200 && status < 300,
    url,
    headers: new Headers({ "content-type": contentType }),
    body: new Response(html).body,
  } as unknown as Response;
}

test("fetchOgImage reads a standard og:image tag", async () => {
  const fetcher: FetchLike = async (url) =>
    response(
      url,
      `<html><head><meta property="og:image" content="https://cdn.example.com/a.jpg"></head></html>`,
    );

  await expect(fetchOgImage("https://publisher.example/story", fetcher)).resolves.toBe(
    "https://cdn.example.com/a.jpg",
  );
});

test("fetchOgImage resolves protocol-relative and root-relative image URLs", async () => {
  const protocolRelative: FetchLike = async (url) =>
    response(
      url,
      `<html><head><meta property="og:image" content="//cdn.example.com/a.jpg"></head></html>`,
    );
  const rootRelative: FetchLike = async (url) =>
    response(
      url,
      `<html><head><meta name="twitter:image" content="/images/a.jpg"></head></html>`,
    );

  await expect(
    fetchOgImage("https://publisher.example/story", protocolRelative),
  ).resolves.toBe("https://cdn.example.com/a.jpg");
  await expect(
    fetchOgImage("https://publisher.example/story", rootRelative),
  ).resolves.toBe("https://publisher.example/images/a.jpg");
});

test("fetchOgImage falls back to link[rel=image_src] and JSON-LD image", async () => {
  const linkTag: FetchLike = async (url) =>
    response(url, `<html><head><link rel="image_src" href="/a.jpg"></head></html>`);
  const jsonLd: FetchLike = async (url) =>
    response(
      url,
      `<html><head><script type="application/ld+json">${JSON.stringify({
        "@type": "NewsArticle",
        image: { "@type": "ImageObject", url: "https://cdn.example.com/b.jpg" },
      })}</script></head></html>`,
    );

  await expect(fetchOgImage("https://publisher.example/story", linkTag)).resolves.toBe(
    "https://publisher.example/a.jpg",
  );
  await expect(fetchOgImage("https://publisher.example/story", jsonLd)).resolves.toBe(
    "https://cdn.example.com/b.jpg",
  );
});

test("fetchOgImage returns null for dead links, soft-404s, and non-HTML responses", async () => {
  const notFound: FetchLike = async (url) => response(url, "", 404);
  const soft404: FetchLike = async () =>
    response("https://publisher.example/404", "<html></html>");
  const nonHtml: FetchLike = async (url) => response(url, "", 200, "image/png");

  await expect(
    fetchOgImage("https://publisher.example/gone", notFound),
  ).resolves.toBeNull();
  await expect(
    fetchOgImage("https://publisher.example/gone", soft404),
  ).resolves.toBeNull();
  await expect(
    fetchOgImage("https://publisher.example/gone", nonHtml),
  ).resolves.toBeNull();
});

test("fetchOgImage returns null when no image tag is present", async () => {
  const fetcher: FetchLike = async (url) => response(url, "<html><head></head></html>");

  await expect(
    fetchOgImage("https://publisher.example/story", fetcher),
  ).resolves.toBeNull();
});

test("fetchOgImages tries every candidate independently and preserves order", async () => {
  const fetcher: FetchLike = async (url) => {
    if (url.includes("no-image")) return response(url, "<html><head></head></html>");
    return response(
      url,
      `<html><head><meta property="og:image" content="https://cdn.example.com/${url}.jpg"></head></html>`,
    );
  };

  const results = await fetchOgImages(
    ["https://a.example/no-image", null, "https://b.example/story"],
    6,
    fetcher,
  );

  expect(results).toEqual([
    null,
    null,
    "https://cdn.example.com/https://b.example/story.jpg",
  ]);
});
