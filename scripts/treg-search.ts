import { tregSearch, type TregSearchRequest } from "./lib/treg-search";

async function main() {
  const token = process.env.TREG_TOKEN?.trim();
  if (!token) {
    throw new Error("TREG_TOKEN is required");
  }

  const request = JSON.parse(await Bun.stdin.text()) as TregSearchRequest;
  console.log(JSON.stringify(await tregSearch(request, token), null, 2));
}

await main();
