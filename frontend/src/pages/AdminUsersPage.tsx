import { useEffect, useRef, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { get, post, put, del } from '../utils/api';
import { events } from '../events';

interface UserEntry {
  username: string;
  role: string;
  eventSlugs: string[];
}

interface UsersResponse {
  users: UserEntry[];
}

interface CreateUserResponse {
  username: string;
  role: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create user form
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Permissions dialog
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [editingUser, setEditingUser] = useState<UserEntry | null>(null);
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
  const [savingPerms, setSavingPerms] = useState(false);

  const loadUsers = () => {
    setLoading(true);
    get<UsersResponse>('/admin/users')
      .then(data => setUsers(data.users))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load users'))
      .finally(() => setLoading(false));
  };

  useEffect(loadUsers, []);

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      const data = await post<CreateUserResponse>('/admin/users', {
        username: newUsername,
        password: newPassword,
      });
      setUsers(prev => [...prev, { username: data.username, role: data.role, eventSlugs: [] }]);
      setNewUsername('');
      setNewPassword('');
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const deleteUser = async (username: string) => {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    try {
      await del(`/admin/users/${username}`);
      setUsers(prev => prev.filter(u => u.username !== username));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const openPermissions = (user: UserEntry) => {
    setEditingUser(user);
    setSelectedSlugs(new Set(user.eventSlugs));
    dialogRef.current?.showModal();
  };

  const toggleSlug = (slug: string) => {
    setSelectedSlugs(prev => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const savePermissions = async () => {
    if (!editingUser) return;
    setSavingPerms(true);
    try {
      await put(`/admin/users/${editingUser.username}/permissions`, {
        slugs: Array.from(selectedSlugs),
      });
      setUsers(prev =>
        prev.map(u =>
          u.username === editingUser.username
            ? { ...u, eventSlugs: Array.from(selectedSlugs) }
            : u
        )
      );
      dialogRef.current?.close();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save permissions');
    } finally {
      setSavingPerms(false);
    }
  };

  const allEvents = events.map(e => e.config);

  return (
    <AdminLayout>
      <h2>Users</h2>

      {loading && <p>Loading...</p>}
      {error && <p className="error-msg">{error}</p>}

      {!loading && !error && (
        <table className="admin-table" style={{ marginBottom: '2.5rem' }}>
          <thead>
            <tr>
              <th>Username</th>
              <th>Role</th>
              <th>Event Access</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.username}>
                <td>{user.username}</td>
                <td>{user.role}</td>
                <td>
                  {user.role === 'admin'
                    ? <em style={{ color: 'var(--muted)' }}>All events</em>
                    : user.eventSlugs.length === 0
                      ? <em style={{ color: 'var(--muted)' }}>None assigned</em>
                      : user.eventSlugs.join(', ')}
                </td>
                <td className="nowrap">
                  {user.role === 'event_manager' && (
                    <>
                      <button className="btn-link" onClick={() => openPermissions(user)}>
                        Edit permissions
                      </button>
                      {' · '}
                      <button
                        className="btn-link"
                        style={{ color: 'var(--error)' }}
                        onClick={() => void deleteUser(user.username)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <section className="create-user-section">
        <h3>Create Event Manager</h3>
        <form onSubmit={e => void createUser(e)} style={{ maxWidth: '360px' }}>
          <div className="field">
            <label htmlFor="new-username">Username</label>
            <input
              id="new-username"
              type="text"
              required
              value={newUsername}
              onChange={e => setNewUsername(e.target.value)}
              placeholder="letters, numbers, hyphens, underscores"
            />
          </div>
          <div className="field">
            <label htmlFor="new-password">Password</label>
            <input
              id="new-password"
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
          </div>
          {createError && <p className="error-msg">{createError}</p>}
          <button type="submit" disabled={creating}>
            {creating ? 'Creating...' : 'Create User'}
          </button>
        </form>
      </section>

      <dialog ref={dialogRef} className="edit-dialog">
        <h3>Event Access for {editingUser?.username}</h3>
        {allEvents.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>No events exist yet.</p>
        ) : (
          <div className="permissions-list">
            {allEvents.map(event => (
              <label key={event.slug} className="permission-row">
                <input
                  type="checkbox"
                  checked={selectedSlugs.has(event.slug)}
                  onChange={() => toggleSlug(event.slug)}
                />
                <span>
                  <strong>{event.name}</strong>
                  {event.date !== 'TBD' && <span style={{ color: 'var(--muted)' }}> — {event.date}</span>}
                </span>
              </label>
            ))}
          </div>
        )}
        <div className="dialog-actions">
          <button onClick={() => void savePermissions()} disabled={savingPerms}>
            {savingPerms ? 'Saving...' : 'Save'}
          </button>
          <button onClick={() => dialogRef.current?.close()} className="btn-link">Cancel</button>
        </div>
      </dialog>
    </AdminLayout>
  );
}
