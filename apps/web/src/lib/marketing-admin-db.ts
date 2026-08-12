import "server-only";

import { createPostgresPool, type PostgresDb } from "@ai-sports-prediction/db";
import type {
  MarketingAdminCampaignView,
  MarketingAdminPostView
} from "@/lib/marketing-admin-types";

declare global {
  var residualSportsMarketingDb: PostgresDb | undefined;
}

type CampaignRow = Omit<MarketingAdminCampaignView, "posts" | "utcDate" | "createdAtUtc"> & {
  utcDate: string | Date;
  createdAtUtc: string | Date;
};

type PostRow = Omit<
  MarketingAdminPostView,
  "approvedAtUtc" | "providerStatusUpdatedAtUtc" | "publishedAtUtc"
> & {
  campaignId: string;
  approvedAtUtc: string | Date | null;
  providerStatusUpdatedAtUtc: string | Date | null;
  publishedAtUtc: string | Date | null;
};

export type ClaimedTikTokPost = {
  id: string;
  campaignId: string;
  title: string;
  body: string;
  assetUrl: string;
};

export type ClaimedRedditPost = {
  id: string;
  campaignId: string;
  title: string;
  body: string;
  target: string;
};

export type ClaimedInstagramPost = {
  id: string;
  campaignId: string;
  platform: "instagram_feed" | "instagram_story";
  body: string;
  assetUrl: string;
};

export function getMarketingDb(): PostgresDb {
  if (!globalThis.residualSportsMarketingDb) {
    globalThis.residualSportsMarketingDb = createPostgresPool(undefined, {
      connectionTimeoutMillis: 10_000
    });
  }
  return globalThis.residualSportsMarketingDb;
}

export async function listMarketingCampaigns(
  db = getMarketingDb()
): Promise<MarketingAdminCampaignView[]> {
  const campaigns = await db.query<CampaignRow>(`
    select
      c.id,
      c.status,
      coalesce(m.sport, 'sport') as sport,
      m.competition,
      m.home_team as "homeTeam",
      m.away_team as "awayTeam",
      m.utc_date as "utcDate",
      p.predicted_home as "predictedHome",
      p.predicted_away as "predictedAway",
      p.confidence,
      c.created_at_utc as "createdAtUtc"
    from marketing_campaigns c
    join matches m on m.id = c.match_id
    join predictions p on p.id = c.prediction_id
    order by
      case c.status when 'pending_review' then 0 when 'failed' then 1 else 2 end,
      c.created_at_utc desc
    limit 50
  `);
  if (!campaigns.rows.length) return [];

  const posts = await db.query<PostRow>(
    `
      select
        campaign_id as "campaignId",
        id,
        platform,
        target,
        title,
        body,
        asset_url as "assetUrl",
        status,
        approved_by as "approvedBy",
        approved_at_utc as "approvedAtUtc",
        provider_post_id as "providerPostId",
        provider_post_url as "providerPostUrl",
        provider_status as "providerStatus",
        provider_status_updated_at_utc as "providerStatusUpdatedAtUtc",
        error_message as "errorMessage",
        published_at_utc as "publishedAtUtc"
      from marketing_posts
      where campaign_id = any($1::text[])
      order by created_at_utc asc
    `,
    [campaigns.rows.map((campaign) => campaign.id)]
  );

  const postsByCampaign = new Map<string, MarketingAdminPostView[]>();
  for (const row of posts.rows) {
    const values = postsByCampaign.get(row.campaignId) ?? [];
    values.push({
      id: row.id,
      platform: row.platform,
      target: row.target,
      title: row.title,
      body: row.body,
      assetUrl: row.assetUrl,
      status: row.status,
      approvedBy: row.approvedBy,
      approvedAtUtc: toNullableIso(row.approvedAtUtc),
      providerPostId: row.providerPostId,
      providerPostUrl: row.providerPostUrl,
      providerStatus: row.providerStatus,
      providerStatusUpdatedAtUtc: toNullableIso(row.providerStatusUpdatedAtUtc),
      errorMessage: row.errorMessage,
      publishedAtUtc: toNullableIso(row.publishedAtUtc)
    });
    postsByCampaign.set(row.campaignId, values);
  }

  return campaigns.rows.map((campaign) => ({
    ...campaign,
    utcDate: toIso(campaign.utcDate),
    createdAtUtc: toIso(campaign.createdAtUtc),
    posts: postsByCampaign.get(campaign.id) ?? []
  }));
}

export async function updateTikTokPost(
  input: { postId: string; title: string; body: string },
  db = getMarketingDb()
): Promise<boolean> {
  const result = await db.query(
    `
      update marketing_posts set
        title = $2,
        body = $3,
        status = 'pending_review',
        approved_by = null,
        approved_at_utc = null,
        provider_post_id = null,
        provider_post_url = null,
        provider_status = null,
        provider_status_payload = null,
        provider_status_updated_at_utc = null,
        error_message = null,
        updated_at_utc = now()
      where id = $1
        and platform = 'tiktok'
        and status in ('pending_review', 'approved', 'failed')
    `,
    [input.postId, input.title, input.body]
  );
  return Boolean(result.rowCount);
}

export async function updateRedditPost(
  input: { postId: string; title: string; body: string; target: string },
  db = getMarketingDb()
): Promise<boolean> {
  const result = await db.query(
    `update marketing_posts set
       title = $2, body = $3, target = $4, status = 'pending_review',
       approved_by = null, approved_at_utc = null, provider_post_id = null,
       provider_post_url = null, provider_status = null,
       provider_status_payload = null, provider_status_updated_at_utc = null,
       error_message = null, published_at_utc = null, updated_at_utc = now()
     where id = $1 and platform = 'reddit'
       and status in ('pending_review', 'approved', 'failed')`,
    [input.postId, input.title, input.body, input.target]
  );
  return Boolean(result.rowCount);
}

export async function updateInstagramPost(
  input: { postId: string; body: string },
  db = getMarketingDb()
): Promise<boolean> {
  const result = await db.query(
    `update marketing_posts set
       body = $2, status = 'pending_review', approved_by = null,
       approved_at_utc = null, provider_post_id = null,
       provider_post_url = null, provider_status = null,
       provider_status_payload = null, provider_status_updated_at_utc = null,
       error_message = null, published_at_utc = null, updated_at_utc = now()
     where id = $1 and platform in ('instagram_feed', 'instagram_story')
       and status in ('pending_review', 'approved', 'failed')`,
    [input.postId, input.body]
  );
  return Boolean(result.rowCount);
}

export async function approveAndClaimInstagramPost(
  input: { postId: string; body: string; reviewer: string },
  db = getMarketingDb()
): Promise<ClaimedInstagramPost> {
  const client = await db.connect();
  try {
    await client.query("begin");
    const selected = await client.query<{
      id: string;
      campaign_id: string;
      platform: "instagram_feed" | "instagram_story";
      asset_url: string | null;
      status: string;
    }>(
      `select id, campaign_id, platform, asset_url, status
       from marketing_posts
       where id = $1 and platform in ('instagram_feed', 'instagram_story')
       for update`,
      [input.postId]
    );
    const post = selected.rows[0];
    if (!post || !["pending_review", "approved", "failed"].includes(post.status)) {
      throw new Error("Dieser Instagram-Entwurf ist nicht mehr zur Freigabe verfügbar.");
    }
    if (!post.asset_url?.startsWith("https://")) {
      throw new Error("Der Instagram-Entwurf hat noch keine öffentlich erreichbare Bilddatei.");
    }
    const campaign = await client.query(
      `update marketing_campaigns set
         status = 'approved', approved_by = $2, approved_at_utc = now()
       where id = $1 and status in ('pending_review','approved','failed','partially_published')
       returning id`,
      [post.campaign_id, input.reviewer]
    );
    if (!campaign.rowCount) {
      throw new Error("Die Kampagne kann in ihrem aktuellen Status nicht freigegeben werden.");
    }
    await client.query(
      `update marketing_posts set
         body = $2, status = 'publishing', approved_by = $3,
         approved_at_utc = now(), error_message = null,
         provider_status = 'CREATING_MEDIA', provider_status_updated_at_utc = now()
       where id = $1`,
      [post.id, input.body, input.reviewer]
    );
    await client.query("commit");
    return {
      id: post.id,
      campaignId: post.campaign_id,
      platform: post.platform,
      body: input.body,
      assetUrl: post.asset_url
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function markInstagramPostPublished(
  post: Pick<ClaimedInstagramPost, "id" | "campaignId">,
  providerPostId: string,
  db = getMarketingDb()
): Promise<void> {
  await db.query(
    `update marketing_posts set
       status = 'published', provider_post_id = $2, provider_post_url = null,
       provider_status = 'PUBLISHED', provider_status_updated_at_utc = now(),
       error_message = null, published_at_utc = now()
     where id = $1 and platform in ('instagram_feed', 'instagram_story')`,
    [post.id, providerPostId]
  );
  await db.query(
    `update marketing_campaigns set status = 'partially_published' where id = $1`,
    [post.campaignId]
  );
}

export async function markInstagramPostFailed(
  post: Pick<ClaimedInstagramPost, "id" | "campaignId">,
  errorMessage: string,
  db = getMarketingDb()
): Promise<void> {
  await db.query(
    `update marketing_posts set
       status = 'failed', provider_status = 'FAILED', error_message = $2,
       provider_status_updated_at_utc = now()
     where id = $1`,
    [post.id, errorMessage.slice(0, 2000)]
  );
  await db.query(
    `update marketing_campaigns set status = 'failed'
     where id = $1 and status in ('approved','publishing','partially_published')`,
    [post.campaignId]
  );
}

export async function approveAndClaimRedditPost(
  input: {
    postId: string;
    title: string;
    body: string;
    target: string;
    reviewer: string;
    allowedSubreddits: string[];
  },
  db = getMarketingDb()
): Promise<ClaimedRedditPost> {
  const allowed = new Set(input.allowedSubreddits.map((value) => value.toLowerCase()));
  if (!allowed.has(input.target.toLowerCase())) {
    throw new Error(`r/${input.target} ist nicht für Residual Sports freigegeben.`);
  }
  const client = await db.connect();
  try {
    await client.query("begin");
    const selected = await client.query<{ id: string; campaign_id: string; status: string }>(
      `select id, campaign_id, status from marketing_posts
       where id = $1 and platform = 'reddit' for update`,
      [input.postId]
    );
    const post = selected.rows[0];
    if (!post || !["pending_review", "approved", "failed"].includes(post.status)) {
      throw new Error("Dieser Reddit-Entwurf ist nicht mehr zur Freigabe verfügbar.");
    }
    const campaign = await client.query(
      `update marketing_campaigns set
         status = 'approved', approved_by = $2, approved_at_utc = now()
       where id = $1 and status in ('pending_review','approved','failed','partially_published')
       returning id`,
      [post.campaign_id, input.reviewer]
    );
    if (!campaign.rowCount) {
      throw new Error("Die Kampagne kann in ihrem aktuellen Status nicht freigegeben werden.");
    }
    await client.query(
      `update marketing_posts set
         title = $2, body = $3, target = $4, status = 'publishing',
         approved_by = $5, approved_at_utc = now(), error_message = null,
         provider_status = 'SUBMITTING', provider_status_updated_at_utc = now()
       where id = $1`,
      [post.id, input.title, input.body, input.target, input.reviewer]
    );
    await client.query("commit");
    return {
      id: post.id,
      campaignId: post.campaign_id,
      title: input.title,
      body: input.body,
      target: input.target
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function markRedditPostPublished(
  post: Pick<ClaimedRedditPost, "id" | "campaignId">,
  providerPostId: string,
  providerPostUrl: string | null,
  db = getMarketingDb()
): Promise<void> {
  await db.query(
    `update marketing_posts set
       status = 'published', provider_post_id = $2, provider_post_url = $3,
       provider_status = 'PUBLISHED', provider_status_updated_at_utc = now(),
       error_message = null, published_at_utc = now()
     where id = $1 and platform = 'reddit'`,
    [post.id, providerPostId, providerPostUrl]
  );
  await db.query(
    `update marketing_campaigns set status = 'partially_published' where id = $1`,
    [post.campaignId]
  );
}

export async function markRedditPostFailed(
  post: Pick<ClaimedRedditPost, "id" | "campaignId">,
  errorMessage: string,
  db = getMarketingDb()
): Promise<void> {
  await db.query(
    `update marketing_posts set
       status = 'failed', provider_status = 'FAILED', error_message = $2,
       provider_status_updated_at_utc = now()
     where id = $1`,
    [post.id, errorMessage.slice(0, 2000)]
  );
  await db.query(
    `update marketing_campaigns set status = 'failed'
     where id = $1 and status in ('approved','publishing','partially_published')`,
    [post.campaignId]
  );
}

export async function approveAndClaimTikTokPost(
  input: { postId: string; title: string; body: string; reviewer: string },
  db = getMarketingDb()
): Promise<ClaimedTikTokPost> {
  const client = await db.connect();
  try {
    await client.query("begin");
    const selected = await client.query<{
      id: string;
      campaign_id: string;
      asset_url: string | null;
      status: string;
    }>(
      `
        select id, campaign_id, asset_url, status
        from marketing_posts
        where id = $1 and platform = 'tiktok'
        for update
      `,
      [input.postId]
    );
    const post = selected.rows[0];
    if (!post || !["pending_review", "approved", "failed"].includes(post.status)) {
      throw new Error("Dieser TikTok-Entwurf ist nicht mehr zur Freigabe verfügbar.");
    }
    if (!post.asset_url?.startsWith("https://")) {
      throw new Error("Der TikTok-Entwurf hat noch keine öffentlich erreichbare Bilddatei.");
    }

    const campaign = await client.query(
      `
        update marketing_campaigns set
          status = 'approved', approved_by = $2, approved_at_utc = now()
        where id = $1 and status in ('pending_review', 'approved', 'failed', 'partially_published')
        returning id
      `,
      [post.campaign_id, input.reviewer]
    );
    if (!campaign.rowCount) {
      throw new Error("Die Kampagne kann in ihrem aktuellen Status nicht freigegeben werden.");
    }

    await client.query(
      `
        update marketing_posts set
          title = $2,
          body = $3,
          status = 'publishing',
          approved_by = $4,
          approved_at_utc = now(),
          error_message = null,
          provider_status = 'REQUESTING_UPLOAD',
          provider_status_updated_at_utc = now()
        where id = $1
      `,
      [post.id, input.title, input.body, input.reviewer]
    );
    await client.query("commit");
    return {
      id: post.id,
      campaignId: post.campaign_id,
      title: input.title,
      body: input.body,
      assetUrl: post.asset_url
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function markTikTokDraftUploaded(
  post: ClaimedTikTokPost,
  publishId: string,
  db = getMarketingDb()
): Promise<void> {
  const client = await db.connect();
  try {
    await client.query("begin");
    await client.query(
      `
        update marketing_posts set
          status = 'uploaded_draft',
          provider_post_id = $2,
          provider_post_url = null,
          provider_status = 'PROCESSING_DOWNLOAD',
          provider_status_payload = null,
          provider_status_updated_at_utc = now(),
          error_message = null,
          published_at_utc = null
        where id = $1 and status = 'publishing'
      `,
      [post.id, publishId]
    );
    await client.query(
      `update marketing_campaigns set status = 'partially_published' where id = $1`,
      [post.campaignId]
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function markTikTokDraftFailed(
  post: Pick<ClaimedTikTokPost, "id" | "campaignId">,
  errorMessage: string,
  db = getMarketingDb()
): Promise<void> {
  await db.query(
    `
      update marketing_posts set
        status = 'failed', provider_status = 'FAILED', error_message = $2,
        provider_status_updated_at_utc = now()
      where id = $1
    `,
    [post.id, errorMessage.slice(0, 2000)]
  );
  await db.query(
    `update marketing_campaigns set status = 'failed' where id = $1 and status in ('approved', 'publishing', 'partially_published')`,
    [post.campaignId]
  );
}

export async function getTikTokPostForStatus(
  postId: string,
  db = getMarketingDb()
): Promise<{ id: string; campaignId: string; publishId: string } | null> {
  const result = await db.query<{
    id: string;
    campaignId: string;
    publishId: string;
  }>(
    `
      select id, campaign_id as "campaignId", provider_post_id as "publishId"
      from marketing_posts
      where id = $1 and platform = 'tiktok' and provider_post_id is not null
    `,
    [postId]
  );
  return result.rows[0] ?? null;
}

export async function saveTikTokPostStatus(
  input: {
    postId: string;
    status: string;
    failReason: string | null;
    publicPostIds: string[];
    raw: Record<string, unknown>;
  },
  db = getMarketingDb()
): Promise<void> {
  const nextStatus = input.status === "PUBLISH_COMPLETE"
    ? "published"
    : input.status === "FAILED"
      ? "failed"
      : input.status === "SEND_TO_USER_INBOX"
        ? "uploaded_draft"
        : "publishing";
  await db.query(
    `
      update marketing_posts set
        status = $2,
        provider_status = $3,
        provider_status_payload = $4::jsonb,
        provider_status_updated_at_utc = now(),
        error_message = $5,
        published_at_utc = case when $2 = 'published' then now() else published_at_utc end
      where id = $1 and platform = 'tiktok'
    `,
    [
      input.postId,
      nextStatus,
      input.status,
      JSON.stringify(input.raw),
      input.failReason
    ]
  );
}

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toNullableIso(value: string | Date | null): string | null {
  return value === null ? null : toIso(value);
}
