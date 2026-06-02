import { Link } from 'react-router-dom';
import { events } from '../events';

export default function HomePage() {
  return (
    <div className="page home-page">
      <h1>Events</h1>
      <ul className="event-list">
        {events.map(({ config }) => (
          <li key={config.slug}>
            <Link to={`/${config.slug}`}>
              <strong>{config.name}</strong>
              {config.date !== 'TBD' && <span> — {config.date}</span>}
            </Link>
            {config.description && <p>{config.description}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
