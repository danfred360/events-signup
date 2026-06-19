import type { SpotifyTrack } from '../components/SpotifySearch';

function base64urlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function generateVerifier(): string {
  const arr = new Uint8Array(48);
  crypto.getRandomValues(arr);
  return base64urlEncode(arr.buffer);
}

export async function generateChallenge(verifier: string): Promise<string> {
  const encoded = new TextEncoder().encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', encoded);
  return base64urlEncode(hash);
}

export function buildAuthUrl(clientId: string, redirectUri: string, challenge: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'playlist-modify-public playlist-modify-private',
    code_challenge_method: 'S256',
    code_challenge: challenge,
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function exchangeCode(
  code: string,
  verifier: string,
  clientId: string,
  redirectUri: string,
): Promise<string> {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: verifier,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error_description?: string };
    throw new Error(err.error_description ?? `Token exchange failed: ${res.status}`);
  }
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

export async function createPlaylistFromTracks(
  accessToken: string,
  tracks: SpotifyTrack[],
  playlistName: string,
): Promise<string> {
  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

  const meRes = await fetch('https://api.spotify.com/v1/me', { headers });
  if (!meRes.ok) throw new Error('Failed to get Spotify user profile');
  const me = await meRes.json() as { id: string };

  const playlistRes = await fetch(`https://api.spotify.com/v1/users/${me.id}/playlists`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: playlistName, public: false }),
  });
  if (!playlistRes.ok) throw new Error('Failed to create playlist');
  const playlist = await playlistRes.json() as { id: string; external_urls: { spotify: string } };

  // Spotify allows max 100 tracks per request
  const uris = tracks.map(t => `spotify:track:${t.id}`);
  for (let i = 0; i < uris.length; i += 100) {
    const batch = uris.slice(i, i + 100);
    const addRes = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ uris: batch }),
    });
    if (!addRes.ok) throw new Error('Failed to add tracks to playlist');
  }

  return playlist.external_urls.spotify;
}

export const SPOTIFY_CALLBACK_KEY = 'spotify_pkce_state';

export interface SpotifyPkceState {
  verifier: string;
  clientId: string;
  eventSlug: string;
  eventName: string;
  tracks: SpotifyTrack[];
}
