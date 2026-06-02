import { Link, useNavigate } from 'react-router-dom';
import { post } from '../utils/api';
import { clearLoggedIn, isAdmin } from '../utils/auth';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  const logout = async () => {
    try {
      await post('/admin/logout', {});
    } catch {
      // ignore — clear local state regardless
    }
    clearLoggedIn();
    navigate('/admin/login');
  };

  return (
    <div className="admin-layout">
      <nav className="admin-nav">
        <div className="nav-links">
          <Link to="/admin" className="nav-brand">Event Admin</Link>
          {isAdmin() && <Link to="/admin/users" className="nav-link">Users</Link>}
          <Link to="/" className="nav-link">← Site</Link>
        </div>
        <button onClick={logout} className="btn-link">Logout</button>
      </nav>
      <main className="admin-main">{children}</main>
    </div>
  );
}
