import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import type { EventEntry } from '../events';

const PROD_BASE = 'https://events.npole.org';

export default function QRPage({ event }: { event: EventEntry }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const url = `${PROD_BASE}/${event.config.slug}`;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, { width: 320, margin: 2 }).catch(console.error);
    }
  }, [url]);

  return (
    <div className="page qr-page">
      <div className="qr-container">
        <canvas ref={canvasRef} />
        <p className="qr-event-name">{event.config.name}</p>
        <p className="qr-url">{url}</p>
      </div>
      <div className="qr-actions no-print">
        <button onClick={() => window.print()} className="btn">Print</button>
        <Link to={`/${event.config.slug}`} className="btn-link">← Back to form</Link>
      </div>
    </div>
  );
}
