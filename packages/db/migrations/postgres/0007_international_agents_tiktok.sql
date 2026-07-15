alter table if exists editorial_outreach_drafts
  add column if not exists email_language text not null default 'en';

alter table if exists editorial_outreach_drafts
  drop constraint if exists editorial_outreach_drafts_email_language_check;

alter table if exists editorial_outreach_drafts
  add constraint editorial_outreach_drafts_email_language_check
  check (email_language in ('de', 'en', 'es', 'fr', 'it', 'nl'));

alter table if exists marketing_posts
  drop constraint if exists marketing_posts_platform_check;

alter table if exists marketing_posts
  add constraint marketing_posts_platform_check
  check (platform in ('instagram_feed', 'instagram_story', 'x', 'reddit', 'tiktok'));

alter table if exists marketing_post_metrics
  drop constraint if exists marketing_post_metrics_source_check;

alter table if exists marketing_post_metrics
  add constraint marketing_post_metrics_source_check
  check (source in ('instagram', 'x', 'reddit', 'tiktok', 'manual'));
