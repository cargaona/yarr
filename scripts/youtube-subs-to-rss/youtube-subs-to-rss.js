/*
 * youtube-subs-to-rss.js
 *
 * Extracts every channel from your YouTube subscriptions page and downloads
 * an OPML file of their RSS feeds, directly importable into yarr.
 *
 * Usage:
 *   1. Sign in to YouTube.
 *   2. Navigate to: https://www.youtube.com/feed/channels
 *      (the "All subscriptions" page — NOT /feed/subscriptions)
 *   3. Open DevTools (F12) → Console tab.
 *   4. Paste the entire contents of this file and press Enter.
 *   5. Wait — the script auto-scrolls to load every subscription, then
 *      downloads `youtube-subscriptions.opml`.
 *   6. In yarr, click the "+" menu → "Import from OPML" → select the file.
 *
 * Notes:
 *   - Pure read-only scraping. No extensions, no build step, no dependencies.
 *   - YouTube DOM changes may break the selectors below; this is a personal
 *     one-off script, adjust as needed.
 */

(async () => {
  // ---------- config ----------
  const OPML_FOLDER_NAME = "YouTube";
  const OUTPUT_FILENAME = "youtube-subscriptions.opml";
  const SCROLL_DELAY_MS = 800;
  const MAX_SCROLL_IDLE_ROUNDS = 3;
  const HANDLE_FETCH_DELAY_MS = 250;

  // ---------- guard ----------
  if (
    location.hostname !== "www.youtube.com" ||
    location.pathname !== "/feed/channels"
  ) {
    console.error(
      "[yt-subs-to-rss] Please navigate to https://www.youtube.com/feed/channels and re-run this script."
    );
    return;
  }

  console.log("[yt-subs-to-rss] Starting. Auto-scrolling to load all subscriptions...");

  // ---------- helpers ----------
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const tileSelector = "ytd-channel-renderer";

  async function autoScroll() {
    let idleRounds = 0;
    let lastCount = document.querySelectorAll(tileSelector).length;
    while (idleRounds < MAX_SCROLL_IDLE_ROUNDS) {
      window.scrollTo(0, document.documentElement.scrollHeight);
      await sleep(SCROLL_DELAY_MS);
      const count = document.querySelectorAll(tileSelector).length;
      if (count === lastCount) {
        idleRounds++;
      } else {
        idleRounds = 0;
        lastCount = count;
      }
      console.log(`[yt-subs-to-rss] ...${count} channels loaded`);
    }
  }

  function collectChannels() {
    const tiles = document.querySelectorAll(tileSelector);
    const out = [];
    for (const el of tiles) {
      const titleEl = el.querySelector("#channel-title");
      const title = (titleEl?.textContent || "").trim();

      // Prefer the polymer element's data payload.
      let channelId = el.data?.channelId || null;

      // Fallback: parse the /channel/UC... href if present.
      const linkEl = el.querySelector("#main-link");
      const href = linkEl?.getAttribute("href") || "";
      if (!channelId) {
        const m = href.match(/\/channel\/(UC[\w-]+)/);
        if (m) channelId = m[1];
      }

      // Capture handle so we can resolve it later if needed.
      const handle = href.startsWith("/@") ? href.split(/[?#]/)[0] : null;

      if (title) {
        out.push({ title, channelId, handle });
      }
    }
    return out;
  }

  async function resolveHandle(handle) {
    try {
      const res = await fetch("https://www.youtube.com" + handle, {
        credentials: "include",
      });
      const text = await res.text();
      const m = text.match(/"channelId":"(UC[\w-]{22})"/);
      return m ? m[1] : null;
    } catch (err) {
      console.warn("[yt-subs-to-rss] handle fetch failed:", handle, err);
      return null;
    }
  }

  async function enrich(channels) {
    const resolved = [];
    const skipped = [];
    for (const ch of channels) {
      if (!ch.channelId && ch.handle) {
        const id = await resolveHandle(ch.handle);
        if (id) ch.channelId = id;
        await sleep(HANDLE_FETCH_DELAY_MS);
      }
      if (ch.channelId) {
        resolved.push(ch);
      } else {
        console.warn(
          "[yt-subs-to-rss] could not resolve channel ID:",
          ch.title,
          ch.handle || "(no handle)"
        );
        skipped.push(ch);
      }
    }
    return { resolved, skipped };
  }

  const xmlEscape = (s) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

  const toRssUrl = (channelId) =>
    `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

  function buildOpml(entries, folderName) {
    const lines = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push('<opml version="2.0">');
    lines.push("  <head>");
    lines.push("    <title>YouTube Subscriptions</title>");
    lines.push("  </head>");
    lines.push("  <body>");
    lines.push(
      `    <outline title="${xmlEscape(folderName)}" text="${xmlEscape(folderName)}">`
    );
    for (const e of entries) {
      const title = xmlEscape(e.title);
      const xmlUrl = xmlEscape(toRssUrl(e.channelId));
      const htmlUrl = xmlEscape(`https://www.youtube.com/channel/${e.channelId}`);
      lines.push(
        `      <outline type="rss" text="${title}" title="${title}" xmlUrl="${xmlUrl}" htmlUrl="${htmlUrl}"/>`
      );
    }
    lines.push("    </outline>");
    lines.push("  </body>");
    lines.push("</opml>");
    return lines.join("\n");
  }

  function downloadOpml(xml, filename) {
    const blob = new Blob([xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ---------- main ----------
  await autoScroll();

  const channels = collectChannels();
  console.log(`[yt-subs-to-rss] Collected ${channels.length} channel tiles. Resolving IDs...`);

  const { resolved, skipped } = await enrich(channels);

  if (resolved.length === 0) {
    console.error("[yt-subs-to-rss] No channels resolved — aborting download.");
    return;
  }

  const xml = buildOpml(resolved, OPML_FOLDER_NAME);
  downloadOpml(xml, OUTPUT_FILENAME);

  console.table(
    resolved.map((e) => ({
      title: e.title,
      channel_id: e.channelId,
      rss_url: toRssUrl(e.channelId),
    }))
  );
  console.log(
    `[yt-subs-to-rss] Done. total=${channels.length} resolved=${resolved.length} skipped=${skipped.length}`
  );
  console.log(`[yt-subs-to-rss] Downloaded: ${OUTPUT_FILENAME}`);
})();
