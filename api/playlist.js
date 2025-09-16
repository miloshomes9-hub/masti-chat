// api/playlist.js  — AI Playlist Curator (CommonJS)

// --- CORS (same pattern as chat) ---
const ALLOWED_ORIGINS = [
  "https://www.musicmasti.com",
  "https://musicmasti.com",
];

function setCors(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
}

function getJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  try { return req.body ? JSON.parse(req.body) : {}; } catch { return {}; }
}

// --- Spotify helpers (optional; only used if you add env vars) ---
async function getSpotifyAccessToken() {
  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN } = process.env;
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_REFRESH_TOKEN) return null;

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: SPOTIFY_REFRESH_TOKEN,
  });

  const resp = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Authorization": "Basic " + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  return data.access_token || null;
}

async function createSpotifyPlaylist(accessToken, userId, name, description = "") {
  const resp = await fetch(`https://api.spotify.com/v1/users/${encodeURIComponent(userId)}/playlists`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, description, public: false }),
  });
  if (!resp.ok) throw new Error(await resp.text());
  return resp.json();
}

async function searchTrackIds(accessToken, tracks) {
  const ids = [];
  for (const t of tracks) {
    const q = encodeURIComponent(`${t.title} ${t.artist}`);
    const resp = await fetch(`https://api.spotify.com/v1/search?type=track&limit=1&q=${q}`, {
      headers: { "Authorization": `Bearer ${accessToken}` }
    });
    if (!resp.ok) continue;
    const data = await resp.json();
    const id = data?.tracks?.items?.[0]?.uri; // spotify:track:xxx
    if (id) ids.push(id);
  }
  return ids;
}

async function addTracksToPlaylist(accessToken, playlistId, uris) {
  if (!uris.length) return;
  const resp = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ uris }),
  });
  if (!resp.ok) throw new Error(await resp.text());
}

// --- Handler ---
module.exports = async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const body = getJsonBody(req);
  const vibe = String(body.vibe || "").trim();
  const length = Number(body.length || 20);
  const notes = String(body.notes || "").trim();

  if (!vibe) return res.status(400).json({ error: "Missing 'vibe' in body" });

  // Prompt OpenAI for a JSON list of tracks
  let openaiJson;
  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.6,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
`You are a professional wedding DJ playlist curator for Music Masti Magic.
Return strictly JSON with this shape:
{
  "playlist_name": "string",
  "tracks": [{"artist":"string","title":"string"}]
}
Focus on Bollywood/Punjabi/Gujarati/South Indian + Top 40/EDM/Hip-Hop/Latin blends for mixed crowds when relevant.
Avoid explicit versions. Balance energy for events.`
          },
          {
            role: "user",
            content:
`Create ${length} tracks for:
Vibe: ${vibe}
Notes: ${notes || "N/A"}
Format: JSON only.`
          }
        ],
      }),
    });
    if (!resp.ok) throw new Error(await resp.text());
    const data = await resp.json();
    openaiJson = JSON.parse(data?.choices?.[0]?.message?.content || "{}");
  } catch (err) {
    console.error("OpenAI error:", err);
    return res.status(500).json({ error: "OpenAI failed", detail: String(err) });
  }

  const playlistName = openaiJson.playlist_name || `Masti AI Playlist – ${new Date().toLocaleDateString()}`;
  const tracks = Array.isArray(openaiJson.tracks) ? openaiJson.tracks : [];

  // BASIC MODE: just return the list + handy links
  let result = {
    mode: "basic",
    playlist_name: playlistName,
    tracks: tracks.map(t => ({
      artist: t.artist,
      title: t.title,
      youtube: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${t.title} ${t.artist}`)}`,
      spotify: `https://open.spotify.com/search/${encodeURIComponent(`${t.title} ${t.artist}`)}`
    }))
  };

  // PRO MODE: use Spotify if env vars are present
  try {
    const { SPOTIFY_USER_ID } = process.env;
    const token = await getSpotifyAccessToken();
    if (token && SPOTIFY_USER_ID) {
      const created = await createSpotifyPlaylist(
        token,
        SPOTIFY_USER_ID,
        playlistName,
        "Auto-generated by Music Masti Magic AI curator"
      );
      const uris = await searchTrackIds(token, tracks);
      if (uris.length) await addTracksToPlaylist(token, created.id, uris);

      result.mode = "spotify";
      result.spotify_playlist_url = created.external_urls?.spotify;
      result.spotify_playlist_id = created.id;
    }
  } catch (err) {
    console.warn("Spotify step failed (returning basic mode):", err?.message || err);
  }

  return res.status(200).json(result);
};
