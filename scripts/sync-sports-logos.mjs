/**
 * Downloads the sports badges used by the site and stores optimized copies in public/.
 * Runtime pages can then render logos without waiting for a third-party image host.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = resolve(repoRoot, "apps/web/public/sports-logos");
const manifestPath = resolve(repoRoot, "apps/web/src/generated/sports-logo-manifest.json");
const apiKey = process.env.THE_SPORTS_DB_API_KEY
  ?? process.env.THE_SPORTSDB_API_KEY
  ?? process.env.THESPORTSDB_API_KEY;

if (!apiKey) {
  throw new Error("THE_SPORTS_DB_API_KEY is required to sync sports logos.");
}

const leagues = [
  { slug: "premier-league", id: "4328" },
  { slug: "bundesliga", id: "4331" },
  { slug: "serie-a", id: "4332" },
  { slug: "ligue-1", id: "4334" },
  { slug: "la-liga", id: "4335" },
  { slug: "champions-league", id: "4480" },
  { slug: "europa-league", id: "4481" },
  { slug: "fa-cup", id: "4482" },
  { slug: "copa-del-rey", id: "4483" },
  { slug: "coupe-de-france", id: "4484" },
  { slug: "dfb-pokal", id: "4485" },
  { slug: "coppa-italia", id: "4506" },
  { slug: "conference-league", id: "5071" },
  { slug: "nba", id: "4387" },
  { slug: "nfl", id: "4391" },
  { slug: "atp", id: "4464" }
];

await Promise.all([
  mkdir(resolve(publicRoot, "leagues"), { recursive: true }),
  mkdir(resolve(publicRoot, "teams"), { recursive: true }),
  mkdir(dirname(manifestPath), { recursive: true })
]);

const leagueEntries = {};
const teamsById = {};
const teamsByName = {};
const teamAssets = new Map();

for (const league of leagues) {
  const [leagueRows, teamRows] = await Promise.all([
    fetchV1Rows("lookupleague.php", { id: league.id }, "leagues"),
    fetchV2Rows(`list/teams/${league.id}`, "teams")
  ]);
  const leagueRow = leagueRows[0];
  const leagueLogo = pickImage(leagueRow, ["strBadge", "strLogo"]);

  if (leagueLogo) {
    const publicPath = `/sports-logos/leagues/${league.slug}.webp`;
    await saveOptimizedImage(leagueLogo, resolve(publicRoot, `leagues/${league.slug}.webp`), 220);
    leagueEntries[league.slug] = publicPath;
  }

  for (const team of teamRows) {
    const id = stringValue(team.idTeam ?? team.id ?? team.teamId);
    const name = stringValue(team.strTeam ?? team.team ?? team.name);
    const source = pickImage(team, ["strBadge", "strTeamBadge", "strLogo", "badge", "logo"]);
    if (!id || !name || !source) {
      continue;
    }

    const publicPath = `/sports-logos/teams/${id}.webp`;
    teamsById[id] = publicPath;
    teamsByName[normalizeName(name)] = publicPath;
    teamAssets.set(id, { source, destination: resolve(publicRoot, `teams/${id}.webp`) });
  }
}

await runWithConcurrency([...teamAssets.values()], 8, ({ source, destination }) =>
  saveOptimizedImage(source, destination, 160)
);

const manifest = {
  version: 1,
  source: "TheSportsDB",
  leagues: sortObject(leagueEntries),
  teamsById: sortObject(teamsById),
  teamsByName: sortObject(teamsByName)
};

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Stored ${Object.keys(leagueEntries).length} league logos and ${teamAssets.size} team logos locally.`);

async function fetchV1Rows(path, query, preferredKey) {
  const url = new URL(`https://www.thesportsdb.com/api/v1/json/${apiKey}/${path}`);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  const payload = await fetchJson(url, { accept: "application/json" });
  return findRows(payload, preferredKey);
}

async function fetchV2Rows(path, preferredKey) {
  const payload = await fetchJson(new URL(`https://www.thesportsdb.com/api/v2/json/${path}`), {
    "X-API-KEY": apiKey,
    accept: "application/json"
  });
  return findRows(payload, preferredKey);
}

async function fetchJson(url, headers) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    return null;
  }
  return response.json();
}

async function saveOptimizedImage(source, destination, size) {
  const response = await fetch(source);
  if (!response.ok) {
    throw new Error(`Logo download failed with status ${response.status}: ${new URL(source).hostname}${new URL(source).pathname}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await sharp(buffer)
    .resize({ width: size, height: size, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 86, alphaQuality: 92 })
    .toFile(destination);
}

function findRows(payload, preferredKey) {
  if (!payload || typeof payload !== "object") {
    return [];
  }
  if (Array.isArray(payload[preferredKey])) {
    return payload[preferredKey];
  }
  const arrays = findArrays(payload);
  return arrays.find((rows) => rows.some((row) => row && typeof row === "object")) ?? [];
}

function findArrays(value) {
  if (Array.isArray(value)) {
    return [value, ...value.flatMap(findArrays)];
  }
  if (!value || typeof value !== "object") {
    return [];
  }
  return Object.values(value).flatMap(findArrays);
}

function pickImage(row, keys) {
  if (!row || typeof row !== "object") {
    return "";
  }
  return keys.map((key) => stringValue(row[key])).find((value) => /^https:\/\//i.test(value)) ?? "";
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function normalizeName(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sortObject(value) {
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)));
}

async function runWithConcurrency(items, concurrency, task) {
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const item = items[nextIndex];
      nextIndex += 1;
      await task(item);
    }
  });
  await Promise.all(workers);
}
