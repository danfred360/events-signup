import { useEffect, useState } from 'react';
import { post } from '../../utils/api';
import { config } from './config';
import SpotifySearch, { type SpotifyTrack } from '../../components/SpotifySearch';

const PARTY_START = new Date('2026-07-24T19:00:00-04:00');

const PURPLE_DARK = '#4c1d95';
const PURPLE_MID = '#7c3aed';
const PURPLE_LIGHT = '#f5f3ff';
const PURPLE_BORDER = '#ddd6fe';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeLeft(): TimeLeft | null {
  const diff = PARTY_START.getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff / 3600000) % 24),
    minutes: Math.floor((diff / 60000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function Countdown() {
  const [left, setLeft] = useState<TimeLeft | null>(getTimeLeft);

  useEffect(() => {
    const id = setInterval(() => setLeft(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!left) {
    return (
      <p style={{ color: '#fff', fontWeight: 600, fontSize: '1.1rem', margin: 0 }}>
        🎉 The party is happening now!
      </p>
    );
  }

  const units = [
    { label: 'Days', value: left.days },
    { label: 'Hours', value: left.hours },
    { label: 'Min', value: left.minutes },
    { label: 'Sec', value: left.seconds },
  ];

  return (
    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
      {units.map(({ label, value }) => (
        <div
          key={label}
          style={{
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: '10px',
            padding: '0.875rem 1rem',
            minWidth: '72px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {pad(value)}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.75)', marginTop: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function JulyHousePartyOnWestEndAveForm() {
  const [fields, setFields] = useState<Record<string, string>>({});
  const [songs, setSongs] = useState<SpotifyTrack[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const set = (name: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFields(f => ({ ...f, [name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      await post(`/events/${config.slug}/signup`, {
        ...fields,
        songRecommendations: songs.length > 0 ? JSON.stringify(songs) : undefined,
      });
      setStatus('success');
      setMessage("You're on the list! See you July 24th 🎉");
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  };

  if (status === 'success') {
    return (
      <div style={{
        textAlign: 'center',
        padding: '2.5rem 2rem',
        background: PURPLE_LIGHT,
        borderRadius: '16px',
        border: `2px solid ${PURPLE_BORDER}`,
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🎉</div>
        <p style={{ color: PURPLE_DARK, fontWeight: 600, fontSize: '1.1rem', margin: 0 }}>{message}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Countdown banner */}
      <div style={{
        background: `linear-gradient(135deg, ${PURPLE_DARK} 0%, ${PURPLE_MID} 100%)`,
        borderRadius: '16px',
        padding: '2rem 1.5rem',
        marginBottom: '1.5rem',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>🏠</div>
        <p style={{ color: 'rgba(255,255,255,0.85)', margin: '0 0 1.25rem', fontWeight: 500, fontSize: '0.9rem', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
          Countdown to the party
        </p>
        <Countdown />
      </div>

      {/* Details card */}
      <div style={{
        background: PURPLE_LIGHT,
        border: `1px solid ${PURPLE_BORDER}`,
        borderRadius: '12px',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.75rem',
        fontSize: '0.95rem',
      }}>
        <h3 style={{ margin: '0 0 1rem', color: PURPLE_DARK, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
          Party Details
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', color: '#3b0764', lineHeight: 1.5 }}>
          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <span>📅</span>
            <span><strong>Friday, July 24, 2026</strong></span>
          </div>
          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <span>📍</span>
            <span>South West End Ave — reach out to Danny for the specific address</span>
          </div>
          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <span>🍻</span>
            <span>BYOB &amp; snacks — some food will be provided</span>
          </div>
        </div>
      </div>

      {/* RSVP form */}
      <div style={{
        background: '#fff',
        border: `1px solid ${PURPLE_BORDER}`,
        borderRadius: '16px',
        padding: '1.75rem',
        boxShadow: `0 4px 24px rgba(124,58,237,0.08)`,
      }}>
        <h3 style={{ margin: '0 0 1.5rem', color: PURPLE_DARK, fontSize: '1.05rem' }}>
          RSVP
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="fullName" style={{ color: PURPLE_DARK }}>
              Full Name <span aria-hidden="true" style={{ color: PURPLE_MID }}>*</span>
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={fields.fullName ?? ''}
              onChange={set('fullName')}
              style={{ borderColor: PURPLE_BORDER }}
            />
          </div>

          <div className="field">
            <label htmlFor="additionalGuests" style={{ color: PURPLE_DARK }}>
              How many additional guests are you bringing? <span aria-hidden="true" style={{ color: PURPLE_MID }}>*</span>
            </label>
            <input
              id="additionalGuests"
              type="number"
              required
              min="0"
              max="20"
              placeholder="0"
              value={fields.additionalGuests ?? ''}
              onChange={set('additionalGuests')}
              style={{ borderColor: PURPLE_BORDER }}
            />
          </div>

          <div className="field">
            <label htmlFor="phone" style={{ color: PURPLE_DARK }}>
              Phone Number <span aria-hidden="true" style={{ color: PURPLE_MID }}>*</span>
            </label>
            <input
              id="phone"
              type="tel"
              required
              placeholder="(555) 555-5555"
              value={fields.phone ?? ''}
              onChange={set('phone')}
              style={{ borderColor: PURPLE_BORDER }}
            />
          </div>

          {/* Spotify song recommendations */}
          <div className="field" style={{ marginTop: '1.75rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.5rem',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#1db954" aria-hidden="true">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
              <label style={{ color: PURPLE_DARK, margin: 0 }}>
                Add songs to the playlist <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span>
              </label>
            </div>
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
              Search for songs you want to hear at the party and we'll add them to the playlist!
            </p>
            <SpotifySearch value={songs} onChange={setSongs} />
          </div>

          {status === 'error' && <p className="error-msg" style={{ marginTop: '1rem' }}>{message}</p>}

          <button
            type="submit"
            disabled={status === 'loading'}
            style={{
              width: '100%',
              padding: '0.8rem',
              background: status === 'loading'
                ? PURPLE_MID
                : `linear-gradient(135deg, ${PURPLE_DARK} 0%, ${PURPLE_MID} 100%)`,
              border: 'none',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: status === 'loading' ? 'not-allowed' : 'pointer',
              letterSpacing: '0.02em',
              marginTop: '1.5rem',
            }}
          >
            {status === 'loading' ? 'Submitting…' : "Count Me In! 🎉"}
          </button>
        </form>
      </div>
    </div>
  );
}
