import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { get } from '../utils/api';

interface EventSummary {
  slug: string;
  name: string;
  date: string;
  signupCount: number;
}

export default function AdminDashboard() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    get<{ events: EventSummary[] }>('/admin/events')
      .then(data => setEvents(data.events))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <h2>Events</h2>
      {loading && <p>Loading...</p>}
      {error && <p className="error-msg">{error}</p>}
      {!loading && !error && (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Date</th>
              <th>Signups</th>
              <th>Links</th>
            </tr>
          </thead>
          <tbody>
            {events.map(event => (
              <tr key={event.slug}>
                <td>
                  <Link to={`/admin/events/${event.slug}`}>{event.name}</Link>
                </td>
                <td>{event.date}</td>
                <td>{event.signupCount}</td>
                <td className="links-cell">
                  <a href={`/${event.slug}`} target="_blank" rel="noreferrer">Form</a>
                  {' · '}
                  <a href={`/${event.slug}/qr`} target="_blank" rel="noreferrer">QR</a>
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={4}>No events yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </AdminLayout>
  );
}
