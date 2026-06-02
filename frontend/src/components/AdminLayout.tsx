import { Link, useNavigate } from 'react-router-dom';
import { post } from '../utils/api';
import { clearLoggedIn } from '../utils/auth';

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
        <Link to="/admin" className="nav-brand">Event Admin</Link>
        <button onClick={logout} className="btn-link">Logout</button>
      </nav>
      <main className="admin-main">{children}</main>
    </div>
  );
}
