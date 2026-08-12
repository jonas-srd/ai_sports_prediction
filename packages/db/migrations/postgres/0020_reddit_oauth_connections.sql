alter table if exists social_connections drop constraint if exists social_connections_provider_check;
alter table if exists social_connections add constraint social_connections_provider_check check (provider in ('tiktok','reddit'));
