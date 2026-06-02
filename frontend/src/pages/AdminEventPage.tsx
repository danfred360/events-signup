import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { get, patch } from '../utils/api';
import { events } from '../events';
import type { EventConfig } from '../events';

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
          <p className="signup-count">
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
                    <td className="nowrap">{new Date(signup.created_at).toLocaleString()}</td>
                    {fields.map(f => (
                      <td key={f.name}>{String(signup.data[f.name] ?? '')}</td>
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
        {fields.map(field => (
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
