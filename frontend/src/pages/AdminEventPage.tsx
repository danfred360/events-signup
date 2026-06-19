import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { get, patch } from '../utils/api';
import { events } from '../events';
import type { EventConfig } from '../events';
import type { SpotifyTrack } from '../components/SpotifySearch';
import {
  generateVerifier,
  generateChallenge,
  buildAuthUrl,
  SPOTIFY_CALLBACK_KEY,
  type SpotifyPkceState,
} from '../utils/spotifyPkce';

interface Signup {
  id: string;
  event_slug: string;
  data: Record<string, unknown>;
  notes: string | null;
  created_at: string;
  ip_address: string | null;
}

interface AdminSignupsResponse {
  signups: Signup[];
  event: EventConfig;
}

function parseSongs(raw: unknown): SpotifyTrack[] {
  if (!raw || typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (t): t is SpotifyTrack =>
        typeof t === 'object' && t !== null && 'id' in t && 'name' in t && 'artist' in t,
    );
  } catch {
    return [];
  }
}

function SongCell({ raw }: { raw: unknown }) {
  const songs = parseSongs(raw);
  if (songs.length === 0) return <span style={{ color: '#aaa' }}>—</span>;
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
      {songs.map(t => (
        <li key={t.id}>
          <a
            href={`spotify:track:${t.id}`}
            style={{ color: '#1db954', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
          >
            {t.name} — {t.artist}
          </a>
        </li>
      ))}
    </ul>
  );
}

function CreatePlaylistButton({ signups, eventConfig }: { signups: Signup[]; eventConfig: EventConfig }) {
  const [creating, setCreating] = useState(false);

  const allTracks = (() => {
    const seen = new Set<string>();
    const tracks: SpotifyTrack[] = [];
    for (const signup of signups) {
      for (const track of parseSongs(signup.data.songRecommendations)) {
        if (!seen.has(track.id)) {
          seen.add(track.id);
          tracks.push(track);
        }
      }
    }
    return tracks;
  })();

  if (allTracks.length === 0) return null;

  const handleClick = async () => {
    setCreating(true);
    try {
      const res = await get<{ clientId: string }>('/spotify/config');
      const verifier = generateVerifier();
      const challenge = await generateChallenge(verifier);
      const redirectUri = `${window.location.origin}/admin/spotify-callback`;
      const state: SpotifyPkceState = {
        verifier,
        clientId: res.clientId,
        eventSlug: eventConfig.slug,
        eventName: `${eventConfig.name} — Party Playlist`,
        tracks: allTracks,
      };
      sessionStorage.setItem(SPOTIFY_CALLBACK_KEY, JSON.stringify(state));
      window.location.href = buildAuthUrl(res.clientId, redirectUri, challenge);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to start Spotify auth');
      setCreating(false);
    }
  };

  return (
    <button
      onClick={() => void handleClick()}
      disabled={creating}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.5rem 1rem',
        background: creating ? '#15803d' : '#1db954',
        color: '#fff',
        border: 'none',
        borderRadius: '9999px',
        fontWeight: 600,
        fontSize: '0.875rem',
        cursor: creating ? 'not-allowed' : 'pointer',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
      </svg>
      {creating ? 'Opening Spotify…' : `Create Playlist (${allTracks.length} song${allTracks.length !== 1 ? 's' : ''})`}
    </button>
  );
}

export default function AdminEventPage() {
  const { slug } = useParams<{ slug: string }>();
  const [signups, setSignups] = useState<Signup[]>([]);
  const [eventConfig, setEventConfig] = useState<EventConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit modal state
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [editing, setEditing] = useState<Signup | null>(null);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const localEvent = events.find(e => e.config.slug === slug);

  useEffect(() => {
    if (!slug) return;
    get<AdminSignupsResponse>(`/admin/events/${slug}/signups`)
      .then(data => {
        setSignups(data.signups);
        setEventConfig(data.event);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [slug]);

  const saveNotes = async (id: string, notes: string) => {
    try {
      const updated = await patch<{ signup: Signup }>(`/admin/signups/${id}`, { notes });
      setSignups(prev => prev.map(s => (s.id === id ? updated.signup : s)));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save notes');
    }
  };

  const openEdit = (signup: Signup) => {
    const stringified: Record<string, string> = {};
    for (const [k, v] of Object.entries(signup.data)) {
      stringified[k] = v == null ? '' : String(v);
    }
    setEditing(signup);
    setEditData(stringified);
    dialogRef.current?.showModal();
  };

  const closeEdit = () => {
    dialogRef.current?.close();
    setEditing(null);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const updated = await patch<{ signup: Signup }>(`/admin/signups/${editing.id}`, { data: editData });
      setSignups(prev => prev.map(s => (s.id === editing.id ? updated.signup : s)));
      closeEdit();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const fields = localEvent?.config.fields ?? eventConfig?.fields ?? [];
  const hasSongField = fields.some(f => f.type === 'song-recommendations');

  return (
    <AdminLayout>
      <div className="admin-page-header">
        <Link to="/admin">← All Events</Link>
        <h2>{eventConfig?.name ?? slug}</h2>
        {eventConfig?.date && <p>{eventConfig.date}</p>}
      </div>

      {loading && <p>Loading...</p>}
      {error && <p className="error-msg">{error}</p>}

      {!loading && !error && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            <p className="signup-count" style={{ margin: 0 }}>
              {signups.length} signup{signups.length !== 1 ? 's' : ''}
              {(() => {
                const guestTotal = signups.reduce((sum, s) => {
                  const g = Number(s.data.guests);
                  return sum + (Number.isFinite(g) && g > 0 ? g : 0);
                }, 0);
                const total = signups.length + guestTotal;
                return guestTotal > 0
                  ? ` · ${total} total attendee${total !== 1 ? 's' : ''}`
                  : null;
              })()}
            </p>
            {hasSongField && eventConfig && (
              <CreatePlaylistButton signups={signups} eventConfig={eventConfig} />
            )}
          </div>
          <div className="table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  {fields.map(f => <th key={f.name}>{f.label}</th>)}
                  <th>Notes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {signups.map(signup => (
                  <tr key={signup.id}>
                    <td className="nowrap">{new Date(signup.created_at.endsWith('Z') ? signup.created_at : signup.created_at + 'Z').toLocaleString()}</td>
                    {fields.map(f => (
                      <td key={f.name}>
                        {f.type === 'song-recommendations'
                          ? <SongCell raw={signup.data[f.name]} />
                          : String(signup.data[f.name] ?? '')}
                      </td>
                    ))}
                    <td>
                      <input
                        className="notes-input"
                        defaultValue={signup.notes ?? ''}
                        onBlur={e => {
                          if (e.target.value !== (signup.notes ?? '')) {
                            void saveNotes(signup.id, e.target.value);
                          }
                        }}
                      />
                    </td>
                    <td>
                      <button className="btn-link" onClick={() => openEdit(signup)}>Edit</button>
                    </td>
                  </tr>
                ))}
                {signups.length === 0 && (
                  <tr><td colSpan={fields.length + 3}>No signups yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <dialog ref={dialogRef} className="edit-dialog">
        <h3>Edit Signup</h3>
        {fields.filter(f => f.type !== 'song-recommendations').map(field => (
          <div key={field.name} className="field">
            <label>{field.label}</label>
            {field.type === 'textarea' ? (
              <textarea
                value={editData[field.name] ?? ''}
                onChange={e => setEditData(d => ({ ...d, [field.name]: e.target.value }))}
                rows={3}
              />
            ) : (
              <input
                type={field.type === 'select' ? 'text' : field.type}
                value={editData[field.name] ?? ''}
                onChange={e => setEditData(d => ({ ...d, [field.name]: e.target.value }))}
              />
            )}
          </div>
        ))}
        <div className="dialog-actions">
          <button onClick={saveEdit} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          <button onClick={closeEdit} className="btn-link">Cancel</button>
        </div>
      </dialog>
    </AdminLayout>
  );
}
