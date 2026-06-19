import { useState, useEffect, useRef } from 'react';

export interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  albumArt: string;
}

interface SpotifySearchProps {
  value: SpotifyTrack[];
  onChange: (songs: SpotifyTrack[]) => void;
}

export default function SpotifySearch({ value, onChange }: SpotifySearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setSearchError('');
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      setSearchError('');
      try {
        const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(query.trim())}`);
        const json = await res.json() as { success: boolean; tracks?: SpotifyTrack[]; message?: string };
        if (json.success && json.tracks) {
          setResults(json.tracks);
        } else {
          setSearchError(json.message ?? 'Search failed');
          setResults([]);
        }
      } catch {
        setSearchError('Search unavailable. Please try again.');
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const addTrack = (track: SpotifyTrack) => {
    if (!value.find(t => t.id === track.id)) {
      onChange([...value, track]);
    }
    setQuery('');
    setResults([]);
  };

  const removeTrack = (id: string) => {
    onChange(value.filter(t => t.id !== id));
  };

  const alreadyAdded = (id: string) => value.some(t => t.id === id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="search"
          placeholder="Search for a song or artist…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box' }}
          aria-label="Search Spotify"
          autoComplete="off"
        />
        {searching && (
          <span style={{
            position: 'absolute',
            right: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--muted)',
            fontSize: '0.8rem',
          }}>
            Searching…
          </span>
        )}
      </div>

      {searchError && (
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--error)' }}>{searchError}</p>
      )}

      {results.length > 0 && (
        <ul style={{
          margin: 0,
          padding: 0,
          listStyle: 'none',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
        }}>
          {results.map(track => (
            <li key={track.id}>
              <button
                type="button"
                disabled={alreadyAdded(track.id)}
                onClick={() => addTrack(track)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  background: alreadyAdded(track.id) ? 'var(--surface)' : '#fff',
                  border: 'none',
                  borderBottom: '1px solid var(--border)',
                  cursor: alreadyAdded(track.id) ? 'default' : 'pointer',
                  textAlign: 'left',
                  color: 'var(--text)',
                  opacity: alreadyAdded(track.id) ? 0.5 : 1,
                }}
                onMouseEnter={e => {
                  if (!alreadyAdded(track.id)) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)';
                  }
                }}
                onMouseLeave={e => {
                  if (!alreadyAdded(track.id)) {
                    (e.currentTarget as HTMLButtonElement).style.background = '#fff';
                  }
                }}
              >
                {track.albumArt && (
                  <img
                    src={track.albumArt}
                    alt=""
                    width={40}
                    height={40}
                    style={{ borderRadius: '4px', flexShrink: 0, objectFit: 'cover' }}
                  />
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {track.name}
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {track.artist}
                  </div>
                </div>
                {!alreadyAdded(track.id) && (
                  <span style={{ marginLeft: 'auto', flexShrink: 0, color: '#1db954', fontSize: '1.2rem' }}>+</span>
                )}
                {alreadyAdded(track.id) && (
                  <span style={{ marginLeft: 'auto', flexShrink: 0, color: '#1db954', fontSize: '0.8rem' }}>Added</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {value.length > 0 && (
        <div>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Your picks ({value.length})
          </p>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {value.map(track => (
              <li
                key={track.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.625rem',
                  padding: '0.5rem 0.625rem',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 'var(--radius)',
                }}
              >
                {track.albumArt && (
                  <img
                    src={track.albumArt}
                    alt=""
                    width={32}
                    height={32}
                    style={{ borderRadius: '3px', flexShrink: 0, objectFit: 'cover' }}
                  />
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{track.name}</span>
                  <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}> — {track.artist}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeTrack(track.id)}
                  aria-label={`Remove ${track.name}`}
                  style={{
                    flexShrink: 0,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--muted)',
                    fontSize: '1rem',
                    lineHeight: 1,
                    padding: '0.125rem 0.25rem',
                    borderRadius: '3px',
                  }}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
