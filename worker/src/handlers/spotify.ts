import type { Env } from '../index';

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface SpotifySearchResponse {
  tracks: {
    items: Array<{
      id: string;
      name: string;
      artists: Array<{ name: string }>;
      album: {
        images: Array<{ url: string; width: number; height: number }>;
      };
    }>;
  };
}

async function getAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const credentials = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) {
    throw new Error(`Spotify auth failed: ${res.status}`);
  }
  const data = (await res.json()) as SpotifyTokenResponse;
  return data.access_token;
}

export function handleSpotifyConfig(env: Env): Response {
  if (!env.SPOTIFY_CLIENT_ID) {
    return Response.json({ success: false, message: 'Spotify integration is not configured' }, { status: 503 });
  }
  return Response.json({ success: true, clientId: env.SPOTIFY_CLIENT_ID });
}

export async function handleSpotifySearch(request: Request, env: Env): Promise<Response> {
  if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) {
    return Response.json(
      { success: false, message: 'Spotify integration is not configured' },
      { status: 503 }
    );
  }

  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim();
  if (!q) {
    return Response.json({ success: true, tracks: [] });
  }

  try {
    const token = await getAccessToken(env.SPOTIFY_CLIENT_ID, env.SPOTIFY_CLIENT_SECRET);

    const searchUrl = new URL('https://api.spotify.com/v1/search');
    searchUrl.searchParams.set('q', q);
    searchUrl.searchParams.set('type', 'track');
    searchUrl.searchParams.set('limit', '10');

    const res = await fetch(searchUrl.href, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error(`Spotify search failed: ${res.status}`);
    }

    const data = (await res.json()) as SpotifySearchResponse;
    const tracks = data.tracks.items.map(item => ({
      id: item.id,
      name: item.name,
      artist: item.artists.map(a => a.name).join(', '),
      // Spotify returns images largest-first; take the smallest for thumbnails
      albumArt: item.album.images.at(-1)?.url ?? '',
    }));

    return Response.json({ success: true, tracks });
  } catch (err) {
    console.error('Spotify search error:', err);
    return Response.json(
      { success: false, message: 'Search unavailable, please try again' },
      { status: 502 }
    );
  }
}
