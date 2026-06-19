import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import {
  exchangeCode,
  createPlaylistFromTracks,
  SPOTIFY_CALLBACK_KEY,
  type SpotifyPkceState,
} from '../utils/spotifyPkce';

type Status = 'loading' | 'success' | 'error';

export default function SpotifyCallback() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>('loading');
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [eventSlug, setEventSlug] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      setErrorMsg(`Spotify authorization was denied: ${error}`);
      setStatus('error');
      return;
    }

    if (!code) {
      setErrorMsg('No authorization code received from Spotify.');
      setStatus('error');
      return;
    }

    const raw = sessionStorage.getItem(SPOTIFY_CALLBACK_KEY);
    if (!raw) {
      setErrorMsg('Session state missing — please try again from the admin page.');
      setStatus('error');
      return;
    }

    const state = JSON.parse(raw) as SpotifyPkceState;
    sessionStorage.removeItem(SPOTIFY_CALLBACK_KEY);
    setEventSlug(state.eventSlug);

    const redirectUri = `${window.location.origin}/admin/spotify-callback`;

    void (async () => {
      try {
        const token = await exchangeCode(code, state.verifier, state.clientId, redirectUri);
        const url = await createPlaylistFromTracks(token, state.tracks, state.eventName);
        setPlaylistUrl(url);
        setStatus('success');
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
        setStatus('error');
      }
    })();
  }, [searchParams]);

  return (
    <AdminLayout>
      <div style={{ maxWidth: 480, margin: '3rem auto', textAlign: 'center', padding: '0 1rem' }}>
        {status === 'loading' && (
          <>
            <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎵</p>
            <p>Creating your Spotify playlist…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <p style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</p>
            <h2 style={{ marginBottom: '0.75rem' }}>Playlist created!</h2>
            <p style={{ marginBottom: '1.5rem', color: '#555' }}>
              All guest song recommendations have been added to your playlist.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
              <a
                href={playlistUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 1.25rem',
                  background: '#1db954',
                  color: '#fff',
                  borderRadius: '9999px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  fontSize: '0.95rem',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
                Open in Spotify
              </a>
              {eventSlug && (
                <Link to={`/admin/events/${eventSlug}`} style={{ color: '#555', fontSize: '0.875rem' }}>
                  ← Back to event
                </Link>
              )}
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>❌</p>
            <h2 style={{ marginBottom: '0.75rem' }}>Something went wrong</h2>
            <p style={{ marginBottom: '1.5rem', color: '#dc2626' }}>{errorMsg}</p>
            {eventSlug && (
              <Link to={`/admin/events/${eventSlug}`} style={{ color: '#555', fontSize: '0.875rem' }}>
                ← Back to event
              </Link>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
