"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type {
  MarketingAdminCampaignView,
  MarketingAdminPostView,
  MarketingAdminResponse
} from "@/lib/marketing-admin-types";
import styles from "./marketing-studio-preview.module.css";

type DraftEdit = { title: string; body: string; target?: string };
type ApiFailure = { message?: string };

const STATUS_LABELS: Record<string, string> = {
  pending_review: "Zur Freigabe",
  approved: "Freigegeben",
  publishing: "Wird übertragen",
  uploaded_draft: "In TikTok bereit",
  published: "Veröffentlicht",
  failed: "Fehlgeschlagen",
  rejected: "Abgelehnt",
  skipped: "Übersprungen"
};

const PROVIDER_LABELS: Record<string, string> = {
  REQUESTING_UPLOAD: "Upload wird angefordert",
  PROCESSING_DOWNLOAD: "TikTok lädt das Motiv",
  SEND_TO_USER_INBOX: "Entwurf im TikTok-Postfach",
  PUBLISH_COMPLETE: "Auf TikTok veröffentlicht",
  FAILED: "TikTok-Verarbeitung fehlgeschlagen"
};

export function MarketingStudioPreview() {
  const [data, setData] = useState<MarketingAdminResponse | null>(null);
  const [edits, setEdits] = useState<Record<string, DraftEdit>>({});
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const [busyPost, setBusyPost] = useState<string | null>(null);
  const [busyConnection, setBusyConnection] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/marketing", {
        cache: "no-store",
        credentials: "same-origin"
      });
      if (response.status === 401) {
        window.location.assign("/admin/login?next=/admin/marketing");
        return;
      }
      const payload = await response.json() as MarketingAdminResponse | ApiFailure;
      if (!response.ok || !("ok" in payload)) {
        throw new Error("message" in payload && payload.message
          ? payload.message
          : "Das Marketing Studio konnte nicht geladen werden.");
      }
      setData(payload);
      setEdits((current) => {
        const next = { ...current };
        for (const campaign of payload.campaigns) {
          for (const post of campaign.posts.filter((entry) => [
            "instagram_feed",
            "instagram_story",
            "tiktok",
            "reddit"
          ].includes(entry.platform))) {
            if (!next[post.id]) {
              next[post.id] = {
                title: post.title ?? "",
                body: post.body,
                target: post.platform === "reddit" ? post.target : undefined
              };
            }
          }
        }
        return next;
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Das Marketing Studio ist nicht verfügbar.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const url = new URL(window.location.href);
    showOAuthResult("TikTok", url.searchParams.get("tiktok"), url.searchParams.get("reason"), setMessage, setError);
    showOAuthResult("Reddit", url.searchParams.get("reddit"), url.searchParams.get("reason"), setMessage, setError);
  }, [load]);

  const tiktokPosts = useMemo(() => data?.campaigns.flatMap((campaign) =>
    campaign.posts
      .filter((post) => post.platform === "tiktok")
      .map((post) => ({ campaign, post }))) ?? [], [data]);
  const instagramPosts = useMemo(() => data?.campaigns.flatMap((campaign) =>
    campaign.posts
      .filter((post) => post.platform === "instagram_feed" || post.platform === "instagram_story")
      .map((post) => ({ campaign, post }))) ?? [], [data]);
  const redditPosts = useMemo(() => data?.campaigns.flatMap((campaign) =>
    campaign.posts
      .filter((post) => post.platform === "reddit")
      .map((post) => ({ campaign, post }))) ?? [], [data]);

  async function act(payload: Record<string, unknown>, successMessage: string, postId?: string) {
    if (postId) setBusyPost(postId);
    else setBusyConnection(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/marketing", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (response.status === 401) {
        window.location.assign("/admin/login?next=/admin/marketing");
        return;
      }
      const result = await response.json() as { ok?: boolean; message?: string };
      if (!response.ok || !result.ok) throw new Error(result.message || "Die Aktion ist fehlgeschlagen.");
      setMessage(successMessage);
      if (postId) setConfirmed((current) => ({ ...current, [postId]: false }));
      await load(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Die Aktion ist fehlgeschlagen.");
    } finally {
      if (postId) setBusyPost(null);
      else setBusyConnection(false);
    }
  }

  async function disconnectTikTok() {
    if (!window.confirm("TikTok wirklich von Residual Sports trennen? Bereits hochgeladene Entwürfe bleiben in TikTok erhalten.")) return;
    await act({ action: "disconnect_tiktok", confirmed: true }, "TikTok wurde getrennt.");
  }

  async function disconnectReddit() {
    if (!window.confirm("Reddit wirklich von Residual Sports trennen? Bereits veröffentlichte Beiträge bleiben bestehen.")) return;
    await act({ action: "disconnect_reddit", confirmed: true }, "Reddit wurde getrennt.");
  }

  const connected = data?.tiktokConnection?.status === "connected";
  const instagramConnected = Boolean(data?.instagramConfigured);
  const redditConnected = data?.redditConnection?.status === "connected";
  const failedCount = [...tiktokPosts, ...instagramPosts, ...redditPosts]
    .filter(({ post }) => post.status === "failed").length;

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Residual Sports · Marketing Agent</span>
          <h1>Marketing Studio</h1>
          <p>Predictions prüfen, Inhalte anpassen und bewusst für TikTok, Instagram oder Reddit freigeben.</p>
        </div>
        <div className={styles.headerActions}>
          <Link className={styles.ghostButton} href="/admin/outreach">Outreach Cockpit</Link>
          <button className={styles.ghostButton} disabled={loading} onClick={() => void load()} type="button">Aktualisieren</button>
        </div>
      </header>

      {message ? <div className={styles.successBanner} role="status">{message}</div> : null}
      {error ? <div className={styles.errorBanner} role="alert">{error}</div> : null}

      <section className={styles.connectionCard}>
        <div className={styles.connectionHeading}>
          <div className={styles.tiktokMark}>♪</div>
          <div>
            <span className={styles.sectionKicker}>Content Posting API</span>
            <h2>TikTok-Verbindung</h2>
          </div>
          <ConnectionBadge configured={Boolean(data?.tiktokConfigured)} connected={connected} />
        </div>

        {loading ? (
          <p className={styles.muted}>Verbindung wird geprüft …</p>
        ) : !data?.tiktokConfigured ? (
          <div className={styles.connectionBody}>
            <p>Client Key, Client Secret oder der Schlüssel zur Token-Verschlüsselung fehlen noch auf dem Server.</p>
            <span>Es werden keine Zugangsdaten im Browser gespeichert.</span>
          </div>
        ) : data.tiktokConnection ? (
          <div className={styles.profileRow}>
            {data.tiktokConnection.avatarUrl
              ? <img alt="TikTok-Profilbild" className={styles.avatar} src={data.tiktokConnection.avatarUrl} />
              : <div className={styles.avatarFallback}>♪</div>}
            <div className={styles.profileInfo}>
              <strong>{data.tiktokConnection.displayName || "Verbundenes TikTok-Konto"}</strong>
              <span>{data.tiktokConnection.scopes.join(" · ")}</span>
              <small>Verbunden am {formatDate(data.tiktokConnection.connectedAtUtc)} · automatische Token-Erneuerung aktiv</small>
              {data.tiktokConnection.lastError ? <em>{data.tiktokConnection.lastError}</em> : null}
            </div>
            <div className={styles.connectionActions}>
              {data.tiktokConnection.status !== "connected"
                ? <a className={styles.primaryButton} href="/api/tiktok/oauth/start">Neu verbinden</a>
                : null}
              <button className={styles.dangerButton} disabled={busyConnection} onClick={() => void disconnectTikTok()} type="button">Trennen</button>
            </div>
          </div>
        ) : (
          <div className={styles.connectionBody}>
            <div>
              <strong>Noch kein TikTok-Konto verbunden</strong>
              <p>Du meldest dich einmal bei TikTok an und erlaubst Profilzugriff sowie Entwurfs-Uploads.</p>
            </div>
            <a className={styles.primaryButton} href="/api/tiktok/oauth/start">TikTok verbinden</a>
          </div>
        )}
      </section>

      <section className={styles.connectionCard}>
        <div className={styles.connectionHeading}>
          <div className={styles.instagramMark}>◎</div>
          <div>
            <span className={styles.sectionKicker}>Instagram Graph API</span>
            <h2>Instagram-Verbindung</h2>
          </div>
          <ConnectionBadge configured={instagramConnected} connected={instagramConnected} />
        </div>

        {loading ? (
          <p className={styles.muted}>Verbindung wird geprüft …</p>
        ) : instagramConnected ? (
          <div className={styles.profileRow}>
            <div className={`${styles.avatarFallback} ${styles.instagramAvatar}`}>◎</div>
            <div className={styles.profileInfo}>
              <strong>{data?.instagramAccountLabel || "Residual Sports"}</strong>
              <span>Feed-Beiträge · Stories</span>
              <small>Serverseitig verbunden · Veröffentlichung nur nach manueller Freigabe</small>
            </div>
            <span className={`${styles.connectionBadge} ${styles.connected}`}><i /> Bereit</span>
          </div>
        ) : (
          <div className={styles.connectionBody}>
            <div>
              <strong>Instagram-Konfiguration fehlt noch</strong>
              <p>Instagram-Konto-ID oder Zugriffstoken fehlen auf dem Server.</p>
            </div>
            <span>Der Bereich bleibt sichtbar; Veröffentlichen ist bis zur Konfiguration gesperrt.</span>
          </div>
        )}
      </section>

      <section className={styles.connectionCard}>
        <div className={styles.connectionHeading}>
          <div className={styles.redditMark}>r/</div>
          <div>
            <span className={styles.sectionKicker}>Reddit Data API</span>
            <h2>Reddit-Verbindung</h2>
          </div>
          <ConnectionBadge configured={Boolean(data?.redditConfigured)} connected={redditConnected} />
        </div>

        {loading ? (
          <p className={styles.muted}>Verbindung wird geprüft …</p>
        ) : !data?.redditConfigured ? (
          <div className={styles.connectionBody}>
            <div>
              <strong>Reddit-Konfiguration fehlt noch</strong>
              <p>Client-ID, Client-Secret oder der Schlüssel zur Token-Verschlüsselung fehlen auf dem Server.</p>
            </div>
            <span>Veröffentlichen bleibt bis zur Reddit-Freigabe deaktiviert.</span>
          </div>
        ) : data.redditConnection ? (
          <div className={styles.profileRow}>
            {data.redditConnection.avatarUrl
              ? <img alt="Reddit-Profilbild" className={styles.avatar} src={data.redditConnection.avatarUrl} />
              : <div className={styles.avatarFallback}>r/</div>}
            <div className={styles.profileInfo}>
              <strong>u/{data.redditConnection.displayName || "verbunden"}</strong>
              <span>{data.redditConnection.scopes.join(" · ")}</span>
              <small>Verbunden am {formatDate(data.redditConnection.connectedAtUtc)} · automatische Token-Erneuerung aktiv</small>
              {data.redditConnection.lastError ? <em>{data.redditConnection.lastError}</em> : null}
            </div>
            <div className={styles.connectionActions}>
              {data.redditConnection.status !== "connected"
                ? <a className={styles.primaryButton} href="/api/reddit/oauth/start">Neu verbinden</a>
                : null}
              <button className={styles.dangerButton} disabled={busyConnection} onClick={() => void disconnectReddit()} type="button">Trennen</button>
            </div>
          </div>
        ) : (
          <div className={styles.connectionBody}>
            <div>
              <strong>Noch kein Reddit-Konto verbunden</strong>
              <p>Du meldest dich einmal bei Reddit an und erlaubst Profilzugriff sowie Text-Beiträge.</p>
            </div>
            <a className={styles.primaryButton} href="/api/reddit/oauth/start">Reddit verbinden</a>
          </div>
        )}
        {!loading && data?.redditConfigured && data.redditSubreddits.length === 0 ? (
          <small className={styles.actionHint}>Vor dem Erstellen von Reddit-Entwürfen muss mindestens ein erlaubter Subreddit konfiguriert werden.</small>
        ) : null}
      </section>

      <section className={styles.statsGrid} aria-label="Marketing-Übersicht">
        <Metric label="TikTok-Entwürfe" value={String(tiktokPosts.length)} />
        <Metric label="Instagram-Entwürfe" value={String(instagramPosts.length)} />
        <Metric label="Reddit-Entwürfe" value={String(redditPosts.length)} />
        <Metric label="Fehler" value={String(failedCount)} alert={failedCount > 0} />
      </section>

      <section className={styles.queueSection}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionKicker}>Instagram-Freigabe</span>
            <h2>Feed-Beiträge und Stories</h2>
          </div>
          <span className={styles.queueCount}>{instagramPosts.length} Entwürfe</span>
        </div>

        {!loading && instagramPosts.length === 0 ? (
          <div className={styles.emptyState}>
            <strong>Noch keine Instagram-Kampagnen vorhanden</strong>
            <p>Sobald der Marketing-Agent eine Kampagne erzeugt, erscheinen Feed-Motiv und Story hier.</p>
          </div>
        ) : null}
        <div className={styles.cardGrid}>
          {instagramPosts.map(({ campaign, post }) => {
            const edit = edits[post.id] ?? { title: "", body: post.body };
            const editable = isEditable(post);
            const busy = busyPost === post.id;
            const canPublish = Boolean(
              instagramConnected
              && confirmed[post.id]
              && editable
              && post.assetUrl?.startsWith("https://")
              && !busy
            );
            const isStory = post.platform === "instagram_story";
            return (
              <article className={styles.draftCard} key={post.id}>
                <div className={styles.draftMeta}>
                  <div>
                    <span>{isStory ? "Instagram Story" : "Instagram Feed"} · {campaign.competition}</span>
                    <h3>{campaign.homeTeam} vs. {campaign.awayTeam}</h3>
                    <small>{formatDate(campaign.utcDate)} · Prediction {campaign.predictedHome}:{campaign.predictedAway}</small>
                  </div>
                  <StatusBadge status={post.status} />
                </div>

                <div className={styles.draftLayout}>
                  <div className={`${styles.assetPreview} ${isStory ? styles.storyPreview : ""}`}>
                    {post.assetUrl
                      ? <img alt={`Instagram-Motiv für ${campaign.homeTeam} gegen ${campaign.awayTeam}`} src={post.assetUrl} />
                      : <div className={styles.noAsset}>Motiv wird noch erzeugt</div>}
                    <span>{isStory ? "STORY" : "FEED"}</span>
                  </div>
                  <div className={styles.editor}>
                    <label>
                      {isStory ? "Interner Story-Text" : "Caption"} <small>{Array.from(edit.body).length}/2200</small>
                      <textarea
                        disabled={!editable || busy}
                        maxLength={2200}
                        onChange={(event) => setEdits((current) => ({
                          ...current,
                          [post.id]: { ...edit, body: event.target.value }
                        }))}
                        rows={8}
                        value={edit.body}
                      />
                    </label>
                    {isStory ? (
                      <small className={styles.actionHint}>Bei Stories wird das fertige Motiv veröffentlicht; dieser Text dient der internen Prüfung.</small>
                    ) : null}
                    {post.errorMessage ? <div className={styles.postError}>{post.errorMessage}</div> : null}
                    {editable ? (
                      <label className={styles.confirmRow}>
                        <input
                          checked={Boolean(confirmed[post.id])}
                          disabled={!instagramConnected || !post.assetUrl || busy}
                          onChange={(event) => setConfirmed((current) => ({
                            ...current,
                            [post.id]: event.target.checked
                          }))}
                          type="checkbox"
                        />
                        <span>Motiv und Inhalt sind geprüft. Diesen Beitrag jetzt auf Instagram veröffentlichen.</span>
                      </label>
                    ) : null}
                    <div className={styles.actionRow}>
                      {editable ? (
                        <>
                          <button
                            className={styles.ghostButton}
                            disabled={busy || !hasChanges(post, edit)}
                            onClick={() => void act({
                              action: "update_instagram_post",
                              postId: post.id,
                              body: edit.body
                            }, "Instagram-Entwurf wurde gespeichert.", post.id)}
                            type="button"
                          >Speichern</button>
                          <button
                            className={styles.primaryButton}
                            disabled={!canPublish}
                            onClick={() => void act({
                              action: "publish_instagram_post",
                              postId: post.id,
                              body: edit.body,
                              confirmed: true
                            }, "Der Beitrag wurde auf Instagram veröffentlicht.", post.id)}
                            type="button"
                          >{busy ? "Wird veröffentlicht …" : "Auf Instagram veröffentlichen"}</button>
                        </>
                      ) : null}
                    </div>
                    {editable && !instagramConnected ? (
                      <small className={styles.actionHint}>Das Instagram-Zugriffstoken muss zuerst serverseitig eingerichtet werden.</small>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.queueSection}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionKicker}>Freigabe-Queue</span>
            <h2>Bearbeitbare TikTok-Entwürfe</h2>
          </div>
          <span className={styles.queueCount}>{tiktokPosts.length} Entwürfe</span>
        </div>

        {loading ? <LoadingCards /> : null}
        {!loading && tiktokPosts.length === 0 ? (
          <div className={styles.emptyState}>
            <strong>Noch keine TikTok-Kampagnen vorhanden</strong>
            <p>Sobald der Marketing-Agent aus einer Prediction eine Kampagne erzeugt, erscheint der Entwurf hier.</p>
          </div>
        ) : null}
        <div className={styles.cardGrid}>
          {tiktokPosts.map(({ campaign, post }) => {
            const edit = edits[post.id] ?? { title: post.title ?? "", body: post.body };
            const editable = isEditable(post);
            const busy = busyPost === post.id;
            const canUpload = Boolean(connected && data?.tiktokConfigured && confirmed[post.id] && editable && !busy);
            return (
              <article className={styles.draftCard} key={post.id}>
                <div className={styles.draftMeta}>
                  <div>
                    <span>{campaign.sport} · {campaign.competition}</span>
                    <h3>{campaign.homeTeam} vs. {campaign.awayTeam}</h3>
                    <small>{formatDate(campaign.utcDate)} · Prediction {campaign.predictedHome}:{campaign.predictedAway}</small>
                  </div>
                  <StatusBadge status={post.status} />
                </div>

                <div className={styles.draftLayout}>
                  <div className={styles.assetPreview}>
                    {post.assetUrl
                      ? <img alt={`TikTok-Motiv für ${campaign.homeTeam} gegen ${campaign.awayTeam}`} src={post.assetUrl} />
                      : <div className={styles.noAsset}>Motiv wird noch erzeugt</div>}
                    <span>PHOTO DRAFT</span>
                  </div>

                  <div className={styles.editor}>
                    <label>
                      Titel <small>{Array.from(edit.title).length}/90</small>
                      <input
                        disabled={!editable || busy}
                        maxLength={90}
                        onChange={(event) => setEdits((current) => ({ ...current, [post.id]: { ...edit, title: event.target.value } }))}
                        value={edit.title}
                      />
                    </label>
                    <label>
                      Beschreibung <small>{Array.from(edit.body).length}/4000</small>
                      <textarea
                        disabled={!editable || busy}
                        maxLength={4000}
                        onChange={(event) => setEdits((current) => ({ ...current, [post.id]: { ...edit, body: event.target.value } }))}
                        rows={8}
                        value={edit.body}
                      />
                    </label>

                    {post.providerStatus ? (
                      <div className={styles.providerStatus}>
                        <span>TikTok-Status</span>
                        <strong>{PROVIDER_LABELS[post.providerStatus] ?? post.providerStatus}</strong>
                        {post.providerStatusUpdatedAtUtc ? <small>Zuletzt geprüft: {formatDate(post.providerStatusUpdatedAtUtc)}</small> : null}
                      </div>
                    ) : null}
                    {post.errorMessage ? <div className={styles.postError}>{post.errorMessage}</div> : null}

                    {editable ? (
                      <label className={styles.confirmRow}>
                        <input
                          checked={Boolean(confirmed[post.id])}
                          disabled={!connected || busy}
                          onChange={(event) => setConfirmed((current) => ({ ...current, [post.id]: event.target.checked }))}
                          type="checkbox"
                        />
                        <span>Motiv und Text sind geprüft. Diesen Beitrag jetzt als bearbeitbaren TikTok-Entwurf übertragen.</span>
                      </label>
                    ) : null}

                    <div className={styles.actionRow}>
                      {editable ? (
                        <>
                          <button
                            className={styles.ghostButton}
                            disabled={busy || !hasChanges(post, edit)}
                            onClick={() => void act({ action: "update_tiktok_post", postId: post.id, ...edit }, "Entwurf wurde gespeichert.", post.id)}
                            type="button"
                          >Speichern</button>
                          <button
                            className={styles.primaryButton}
                            disabled={!canUpload}
                            onClick={() => void act({ action: "upload_tiktok_draft", postId: post.id, ...edit, confirmed: true }, "Der Entwurf wurde an TikTok übertragen. Öffne TikTok, prüfe ihn dort und veröffentliche ihn manuell.", post.id)}
                            type="button"
                          >{busy ? "Wird übertragen …" : "Als TikTok-Entwurf hochladen"}</button>
                        </>
                      ) : null}
                      {post.providerPostId ? (
                        <button
                          className={styles.ghostButton}
                          disabled={!connected || busy}
                          onClick={() => void act({ action: "refresh_tiktok_status", postId: post.id }, "TikTok-Status wurde aktualisiert.", post.id)}
                          type="button"
                        >Status prüfen</button>
                      ) : null}
                    </div>
                    {editable && !connected ? <small className={styles.actionHint}>Verbinde zuerst das Residual-Sports-TikTok-Konto.</small> : null}
                    {post.status === "uploaded_draft" ? <small className={styles.actionHint}>Der Beitrag liegt in TikTok als Entwurf bereit und wird nicht automatisch veröffentlicht.</small> : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.queueSection}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionKicker}>Reddit-Freigabe</span>
            <h2>Bearbeitbare Reddit-Textbeiträge</h2>
          </div>
          <span className={styles.queueCount}>{redditPosts.length} Entwürfe</span>
        </div>

        {!loading && redditPosts.length === 0 ? (
          <div className={styles.emptyState}>
            <strong>Noch keine Reddit-Kampagnen vorhanden</strong>
            <p>Neue Kampagnen erhalten Reddit-Entwürfe, sobald erlaubte Subreddits konfiguriert sind.</p>
          </div>
        ) : null}
        <div className={styles.cardGrid}>
          {redditPosts.map(({ campaign, post }) => {
            const edit = edits[post.id] ?? { title: post.title ?? "", body: post.body, target: post.target };
            const editable = isEditable(post);
            const busy = busyPost === post.id;
            const allowedTarget = Boolean(data?.redditSubreddits.some((entry) =>
              entry.toLowerCase() === (edit.target ?? "").toLowerCase()));
            const canPublish = Boolean(
              redditConnected
              && data?.redditConfigured
              && confirmed[post.id]
              && editable
              && allowedTarget
              && !busy
            );
            return (
              <article className={styles.draftCard} key={post.id}>
                <div className={styles.draftMeta}>
                  <div>
                    <span>{campaign.sport} · {campaign.competition}</span>
                    <h3>{campaign.homeTeam} vs. {campaign.awayTeam}</h3>
                    <small>{formatDate(campaign.utcDate)} · Prediction {campaign.predictedHome}:{campaign.predictedAway}</small>
                  </div>
                  <StatusBadge status={post.status} />
                </div>

                <div className={styles.redditEditor}>
                  <label>
                    Subreddit
                    <select
                      disabled={!editable || busy}
                      onChange={(event) => setEdits((current) => ({ ...current, [post.id]: { ...edit, target: event.target.value } }))}
                      value={edit.target ?? ""}
                    >
                      {!allowedTarget && edit.target ? <option value={edit.target}>r/{edit.target} · nicht freigegeben</option> : null}
                      {(data?.redditSubreddits ?? []).map((target) => <option key={target} value={target}>r/{target}</option>)}
                    </select>
                  </label>
                  <label>
                    Titel <small>{Array.from(edit.title).length}/300</small>
                    <input
                      disabled={!editable || busy}
                      maxLength={300}
                      onChange={(event) => setEdits((current) => ({ ...current, [post.id]: { ...edit, title: event.target.value } }))}
                      value={edit.title}
                    />
                  </label>
                  <label>
                    Text <small>{Array.from(edit.body).length}/40000</small>
                    <textarea
                      disabled={!editable || busy}
                      maxLength={40_000}
                      onChange={(event) => setEdits((current) => ({ ...current, [post.id]: { ...edit, body: event.target.value } }))}
                      rows={9}
                      value={edit.body}
                    />
                  </label>

                  {post.errorMessage ? <div className={styles.postError}>{post.errorMessage}</div> : null}
                  {editable ? (
                    <label className={styles.confirmRow}>
                      <input
                        checked={Boolean(confirmed[post.id])}
                        disabled={!redditConnected || !allowedTarget || busy}
                        onChange={(event) => setConfirmed((current) => ({ ...current, [post.id]: event.target.checked }))}
                        type="checkbox"
                      />
                      <span>Titel, Text und Subreddit sind geprüft. Diesen Beitrag jetzt auf Reddit veröffentlichen.</span>
                    </label>
                  ) : null}

                  <div className={styles.actionRow}>
                    {editable ? (
                      <>
                        <button
                          className={styles.ghostButton}
                          disabled={busy || !allowedTarget || !hasChanges(post, edit)}
                          onClick={() => void act({ action: "update_reddit_post", postId: post.id, ...edit }, "Reddit-Entwurf wurde gespeichert.", post.id)}
                          type="button"
                        >Speichern</button>
                        <button
                          className={styles.primaryButton}
                          disabled={!canPublish}
                          onClick={() => void act({ action: "publish_reddit_post", postId: post.id, ...edit, confirmed: true }, "Der Beitrag wurde auf Reddit veröffentlicht.", post.id)}
                          type="button"
                        >{busy ? "Wird veröffentlicht …" : "Auf Reddit veröffentlichen"}</button>
                      </>
                    ) : null}
                    {post.providerPostUrl ? <a className={styles.ghostButton} href={post.providerPostUrl} rel="noreferrer" target="_blank">Beitrag öffnen</a> : null}
                  </div>
                  {editable && !redditConnected ? <small className={styles.actionHint}>Verbinde zuerst das Residual-Sports-Reddit-Konto.</small> : null}
                  {editable && !allowedTarget ? <small className={styles.actionHint}>Dieser Subreddit ist nicht in der Freigabeliste enthalten.</small> : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function ConnectionBadge({ configured, connected }: { configured: boolean; connected: boolean }) {
  if (!configured) return <span className={`${styles.connectionBadge} ${styles.warning}`}>Konfiguration fehlt</span>;
  if (connected) return <span className={`${styles.connectionBadge} ${styles.connected}`}><i /> Verbunden</span>;
  return <span className={styles.connectionBadge}>Nicht verbunden</span>;
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`${styles.statusBadge} ${styles[`status_${status}`] ?? ""}`}>{STATUS_LABELS[status] ?? status}</span>;
}

function Metric({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
  return <article className={`${styles.metricCard} ${alert ? styles.metricAlert : ""}`}><span>{label}</span><strong>{value}</strong></article>;
}

function LoadingCards() {
  return <div className={styles.loadingCards} aria-label="Marketing-Entwürfe werden geladen"><i /><i /></div>;
}

function isEditable(post: MarketingAdminPostView): boolean {
  return ["pending_review", "approved", "failed"].includes(post.status);
}

function hasChanges(post: MarketingAdminPostView, edit: DraftEdit): boolean {
  return edit.title.trim() !== (post.title ?? "").trim()
    || edit.body.trim() !== post.body.trim()
    || (edit.target ?? post.target).trim() !== post.target.trim();
}

function showOAuthResult(
  provider: "TikTok" | "Reddit",
  status: string | null,
  reason: string | null,
  setMessage: (value: string) => void,
  setError: (value: string) => void
): void {
  if (status === "connected") {
    setMessage(`${provider} wurde erfolgreich mit Residual Sports verbunden.`);
  }
  if (status === "not_configured") {
    setError(`Die serverseitige ${provider}-Konfiguration ist noch unvollständig.`);
  }
  if (status !== "error") return;
  setError(reason === "admin_session"
    ? `Die Admin-Sitzung ging beim Rücksprung von ${provider} verloren. Bitte erneut verbinden.`
    : reason === "authorization_denied"
      ? `Die ${provider}-Autorisierung wurde abgelehnt oder abgebrochen.`
      : reason === "invalid_state"
        ? `Die ${provider}-Anmeldung ist abgelaufen oder wurde in einem anderen Tab gestartet.`
        : `Die ${provider}-Verbindung konnte nicht abgeschlossen werden. Bitte erneut verbinden.`);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Berlin"
  }).format(new Date(value));
}
