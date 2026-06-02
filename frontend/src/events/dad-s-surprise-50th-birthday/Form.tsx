import { useEffect, useState } from 'react';
import { post } from '../../utils/api';
import { config } from './config';

// 2:30 PM Eastern Daylight Time (UTC-4) — guests must arrive before he does at 3 PM
const ARRIVE_BY = new Date('2026-07-19T14:30:00-04:00');

const BLUE = '#1d4ed8';
const BLUE_DARK = '#1e3a8a';
const BLUE_LIGHT = '#eff6ff';
const BLUE_BORDER = '#bfdbfe';
const BLUE_MID = '#3b82f6';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeLeft(): TimeLeft | null {
  const diff = ARRIVE_BY.getTime() - Date.now();
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

export default function DadSSurprise50thBirthdayForm() {
  const [fields, setFields] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const set = (name: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFields(f => ({ ...f, [name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      await post(`/events/${config.slug}/signup`, fields);
      setStatus('success');
      setMessage("You're on the list! See you there — and remember, it's a surprise! 🤫");
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
        background: BLUE_LIGHT,
        borderRadius: '16px',
        border: `2px solid ${BLUE_BORDER}`,
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🎉</div>
        <p style={{ color: BLUE_DARK, fontWeight: 600, fontSize: '1.1rem', margin: 0 }}>{message}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Countdown banner */}
      <div style={{
        background: `linear-gradient(135deg, ${BLUE_DARK} 0%, ${BLUE_MID} 100%)`,
        borderRadius: '16px',
        padding: '2rem 1.5rem',
        marginBottom: '1.5rem',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>🎂</div>
        <p style={{ color: 'rgba(255,255,255,0.85)', margin: '0 0 1.25rem', fontWeight: 500, fontSize: '0.9rem', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
          Countdown to the big surprise
        </p>
        <Countdown />
      </div>

      {/* Details card */}
      <div style={{
        background: BLUE_LIGHT,
        border: `1px solid ${BLUE_BORDER}`,
        borderRadius: '12px',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.75rem',
        fontSize: '0.95rem',
      }}>
        <h3 style={{ margin: '0 0 1rem', color: BLUE_DARK, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
          Party Details
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', color: '#1e3a5f', lineHeight: 1.5 }}>
          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <span>📅</span>
            <span><strong>Sunday, July 19, 2026</strong></span>
          </div>
          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <span>⚠️</span>
            <span>
              <strong>Arrive by 2:30 PM</strong> — he arrives at 3:00 PM. It's a surprise!
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <span>📍</span>
            <span>
              Lancaster Pole Buildings<br />
              138 Ranck Church Road<br />
              New Holland, PA 17557
            </span>
          </div>
        </div>
      </div>

      {/* Form */}
      <div style={{
        background: '#fff',
        border: `1px solid ${BLUE_BORDER}`,
        borderRadius: '16px',
        padding: '1.75rem',
        boxShadow: `0 4px 24px rgba(29,78,216,0.08)`,
      }}>
        <h3 style={{ margin: '0 0 1.5rem', color: BLUE_DARK, fontSize: '1.05rem' }}>
          RSVP
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="fullName" style={{ color: BLUE_DARK }}>
              Full Name <span aria-hidden="true" style={{ color: BLUE }}>*</span>
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={fields.fullName ?? ''}
              onChange={set('fullName')}
              style={{ borderColor: BLUE_BORDER }}
            />
          </div>

          <div className="field">
            <label htmlFor="email" style={{ color: BLUE_DARK }}>
              Email Address <span aria-hidden="true" style={{ color: BLUE }}>*</span>
            </label>
            <input
              id="email"
              type="email"
              required
              value={fields.email ?? ''}
              onChange={set('email')}
              style={{ borderColor: BLUE_BORDER }}
            />
          </div>

          <div className="field">
            <label htmlFor="guests" style={{ color: BLUE_DARK }}>Number of Guests</label>
            <input
              id="guests"
              type="number"
              min="0"
              max="20"
              placeholder="0"
              value={fields.guests ?? ''}
              onChange={set('guests')}
              style={{ borderColor: BLUE_BORDER }}
            />
          </div>

          <div className="field">
            <label htmlFor="notes" style={{ color: BLUE_DARK }}>Notes or Questions</label>
            <textarea
              id="notes"
              rows={3}
              placeholder="Dietary needs, accessibility questions, etc."
              value={fields.notes ?? ''}
              onChange={set('notes')}
              style={{ borderColor: BLUE_BORDER }}
            />
          </div>

          {status === 'error' && <p className="error-msg">{message}</p>}

          <button
            type="submit"
            disabled={status === 'loading'}
            style={{
              width: '100%',
              padding: '0.8rem',
              background: status === 'loading'
                ? BLUE_MID
                : `linear-gradient(135deg, ${BLUE_DARK} 0%, ${BLUE_MID} 100%)`,
              border: 'none',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: status === 'loading' ? 'not-allowed' : 'pointer',
              letterSpacing: '0.02em',
              marginTop: '0.5rem',
            }}
          >
            {status === 'loading' ? 'Submitting…' : "Count Me In! 🎉"}
          </button>
        </form>
      </div>
    </div>
  );
}
