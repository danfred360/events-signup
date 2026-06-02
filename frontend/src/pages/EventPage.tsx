import type { EventEntry } from '../events';

export default function EventPage({ event }: { event: EventEntry }) {
  const { config, Form } = event;
  return (
    <div className="page event-page">
      <header className="event-header">
        <h1>{config.name}</h1>
        {config.date !== 'TBD' && <p className="event-date">{config.date}</p>}
        {config.description && <p className="event-description">{config.description}</p>}
      </header>
      <section className="event-form-section">
        <Form />
      </section>
    </div>
  );
}
