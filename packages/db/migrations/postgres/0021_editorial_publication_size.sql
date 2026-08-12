alter table editorial_prospects
  add column if not exists publication_size text not null default 'unknown';

alter table editorial_prospects
  add column if not exists publication_size_source text not null default 'unknown';

alter table editorial_prospects
  add constraint editorial_prospects_publication_size_check
    check (publication_size in ('small_blog', 'medium_sports_media', 'large_publisher', 'unknown'));

alter table editorial_prospects
  add constraint editorial_prospects_publication_size_source_check
    check (publication_size_source in ('automatic', 'manual', 'unknown'));

update editorial_prospects
set
  publication_size = case
    when coalesce(summary, '') ~* '(verlagsgruppe|mediengruppe|media group|publisher group|national broadcaster|öffentlich-rechtlich|million(en)? (leser|nutzer|users|readers))'
      then 'large_publisher'
    when coalesce(summary, '') ~* '(fan.?blog|persönlicher blog|privater blog|personal blog|independent blog|powered by wordpress)'
      then 'small_blog'
    when coalesce(summary, '') ~* '(sportmagazin|sportportal|sports magazine|sports publication|redaktion|editorial team|newsroom)'
      then 'medium_sports_media'
    else 'unknown'
  end,
  publication_size_source = case
    when coalesce(summary, '') ~* '(verlagsgruppe|mediengruppe|media group|publisher group|national broadcaster|öffentlich-rechtlich|million(en)? (leser|nutzer|users|readers)|fan.?blog|persönlicher blog|privater blog|personal blog|independent blog|powered by wordpress|sportmagazin|sportportal|sports magazine|sports publication|redaktion|editorial team|newsroom)'
      then 'automatic'
    else 'unknown'
  end
where publication_size = 'unknown';

create index if not exists editorial_prospects_size_review_idx
  on editorial_prospects (publication_size, status, fit_score desc);
