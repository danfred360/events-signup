import { Routes, Route } from 'react-router-dom';
import { events } from './events';
import HomePage from './pages/HomePage';
import EventPage from './pages/EventPage';
import QRPage from './pages/QRPage';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminEventPage from './pages/AdminEventPage';
import ProtectedRoute from './components/ProtectedRoute';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/events/:slug"
        element={
          <ProtectedRoute>
            <AdminEventPage />
          </ProtectedRoute>
        }
      />
      {events.map(event => (
        <>
          <Route
            key={event.config.slug}
            path={`/${event.config.slug}`}
            element={<EventPage event={event} />}
          />
          <Route
            key={`${event.config.slug}-qr`}
            path={`/${event.config.slug}/qr`}
            element={<QRPage event={event} />}
          />
        </>
      ))}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
