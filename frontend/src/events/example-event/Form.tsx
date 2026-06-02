import { useState } from 'react';
import { post } from '../../utils/api';
import { config } from './config';

export default function ExampleEventForm() {
  const [fields, setFields] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const set = (name: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFields(f => ({ ...f, [name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      await post(`/api/events/${config.slug}/signup`, fields);
      setStatus('success');
      setMessage("You're signed up! See you there.");
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  };

  if (status === 'success') {
    return <p className="success-msg">{message}</p>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="fullName">Full Name <span aria-hidden="true">*</span></label>
        <input id="fullName" type="text" required value={fields.fullName ?? ''} onChange={set('fullName')} />
      </div>
      <div className="field">
        <label htmlFor="email">Email Address <span aria-hidden="true">*</span></label>
        <input id="email" type="email" required value={fields.email ?? ''} onChange={set('email')} />
      </div>
      <div className="field">
        <label htmlFor="phone">Phone Number</label>
        <input id="phone" type="tel" value={fields.phone ?? ''} onChange={set('phone')} />
      </div>
      <div className="field">
        <label htmlFor="guests">Number of Guests</label>
        <input id="guests" type="number" min="0" value={fields.guests ?? ''} onChange={set('guests')} />
      </div>
      <div className="field">
        <label htmlFor="notes">Notes or Questions</label>
        <textarea id="notes" value={fields.notes ?? ''} onChange={set('notes')} rows={4} />
      </div>
      {status === 'error' && <p className="error-msg">{message}</p>}
      <button type="submit" disabled={status === 'loading'}>
        {status === 'loading' ? 'Signing up...' : 'Sign Up'}
      </button>
    </form>
  );
}
