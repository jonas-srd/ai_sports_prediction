import { createPostgresPool, type PostgresDb } from "@ai-sports-prediction/db";
import type { TennisPlayerCountryProfile } from "./tennis-country-resolver";

declare global {
  var aiSportsTennisCountryDb: PostgresDb | undefined;
  var aiSportsTennisCountryDbDisabledUntil: number | undefined;
}

type StoredTennisPlayerCountryProfile = TennisPlayerCountryProfile & {
  normalizedName: string;
};

export async function loadStoredTennisPlayerCountryProfiles(normalizedNames: string[]) {
  const uniqueNames = [...new Set(normalizedNames.filter(Boolean))];
  if (uniqueNames.length === 0 || !hasDatabaseConfiguration()) {
    return new Map<string, TennisPlayerCountryProfile>();
  }

  if ((globalThis.aiSportsTennisCountryDbDisabledUntil ?? 0) > Date.now()) {
    return new Map<string, TennisPlayerCountryProfile>();
  }

  let result;
  try {
    result = await getTennisCountryDb().query<{
      canonical_name: string;
      country_code: string;
      normalized_name: string;
    }>(`
      select normalized_name, canonical_name, country_code
      from tennis_player_country_profiles
      where normalized_name = any($1::text[])
    `, [uniqueNames]);
  } catch {
    globalThis.aiSportsTennisCountryDbDisabledUntil = Date.now() + 5 * 60 * 1000;
    return new Map<string, TennisPlayerCountryProfile>();
  }

  return new Map(result.rows.map((row) => [
    row.normalized_name,
    {
      canonicalName: row.canonical_name,
      countryCode: row.country_code
    }
  ]));
}

export async function storeTennisPlayerCountryProfiles(profiles: StoredTennisPlayerCountryProfile[]) {
  if (profiles.length === 0 || !hasDatabaseConfiguration()) {
    return;
  }
  if ((globalThis.aiSportsTennisCountryDbDisabledUntil ?? 0) > Date.now()) {
    return;
  }

  const uniqueProfiles = [...new Map(
    profiles.map((profile) => [profile.normalizedName, profile])
  ).values()];
  const normalizedNames = uniqueProfiles.map((profile) => profile.normalizedName);
  const canonicalNames = uniqueProfiles.map((profile) => profile.canonicalName);
  const countryCodes = uniqueProfiles.map((profile) => profile.countryCode);

  try {
    await getTennisCountryDb().query(`
      insert into tennis_player_country_profiles (
        normalized_name,
        canonical_name,
        country_code
      )
      select *
      from unnest($1::text[], $2::text[], $3::text[])
      on conflict (normalized_name) do update set
        canonical_name = excluded.canonical_name,
        country_code = excluded.country_code,
        verified_at_utc = now(),
        updated_at_utc = now()
    `, [normalizedNames, canonicalNames, countryCodes]);
  } catch {
    globalThis.aiSportsTennisCountryDbDisabledUntil = Date.now() + 5 * 60 * 1000;
  }
}

function getTennisCountryDb() {
  return globalThis.aiSportsTennisCountryDb ??= createPostgresPool(undefined, {
    connectionTimeoutMillis: 2_000
  });
}

function hasDatabaseConfiguration() {
  return Boolean(process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim());
}
