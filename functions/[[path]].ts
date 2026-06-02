import { eventOgData } from '../frontend/src/events/og-metadata';

const BASE_URL = 'https://events.npole.org';

// User-Agents that read OG tags for link previews
const CRAWLER = /facebookexternalhit|Twitterbot|WhatsApp|LinkedInBot|Slackbot-LinkExpanding|Discordbot|TelegramBot|applebot|Googlebot/i;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildHtml(params: {
  title: string;
  description: string;
  url: string;
  image?: string;
}): string {
  const { title, description, url, image } = params;
  const t = escapeHtml(title);
  const d = escapeHtml(description);
  const u = escapeHtml(url);
  const card = image ? 'summary_large_image' : 'summary';

  return `<!doctype html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${t}</title>
  <meta property="og:title" content="${t}" />
  <meta property="og:description" content="${d}" />
  <meta property="og:url" content="${u}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="events.npole.org" />
  ${image ? `<meta property="og:image" content="${escapeHtml(image)}" />` : ''}
  <meta name="twitter:card" content="${card}" />
  <meta name="twitter:title" content="${t}" />
  <meta name="twitter:description" content="${d}" />
  ${image ? `<meta name="twitter:image" content="${escapeHtml(image)}" />` : ''}
</head>
<body></body>
</html>`;
}

export async function onRequest(
  context: EventContext<Record<string, string>, string, Record<string, unknown>>
): Promise<Response> {
  const { request } = context;
  const ua = request.headers.get('User-Agent') ?? '';

  if (!CRAWLER.test(ua)) {
    return context.next();
  }

  const url = new URL(request.url);
  const segments = url.pathname.replace(/^\/+/, '').split('/').filter(Boolean);
  const slug = segments[0];
  const isQR = segments[1] === 'qr';

  // Skip non-event paths
  if (!slug || slug === 'admin') {
    return context.next();
  }

  const meta = eventOgData[slug];
  if (!meta) {
    return context.next();
  }

  const pageUrl = `${BASE_URL}${url.pathname}`;

  if (isQR) {
    return new Response(
      buildHtml({
        title: `QR Code — ${meta.name}`,
        description: `Scan to sign up for ${meta.name}`,
        url: pageUrl,
        image: `${BASE_URL}/qr-images/${slug}.png`,
      }),
      { headers: { 'Content-Type': 'text/html;charset=UTF-8' } }
    );
  }

  return new Response(
    buildHtml({
      title: meta.name,
      description: meta.description,
      url: pageUrl,
    }),
    { headers: { 'Content-Type': 'text/html;charset=UTF-8' } }
  );
}
