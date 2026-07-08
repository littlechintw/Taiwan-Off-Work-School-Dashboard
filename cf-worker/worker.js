const ROUTES = {
  '/cap': 'https://alerts.ncdr.nat.gov.tw/RssAtomFeed.ashx?AlertType=33',
  '/kmz': 'https://alerts.ncdr.nat.gov.tw/DownLoadNewAssistData.ashx/81',
};

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
        },
      });
    }

    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 });
    }

    const path = new URL(request.url).pathname;
    const target = ROUTES[path];

    if (!target) {
      return new Response('Not found', { status: 404 });
    }

    // Always hit NCDR live — never serve from Cloudflare's edge cache
    const res = await fetch(target, { cache: 'no-store' });
    const body = await res.arrayBuffer();

    return new Response(body, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('Content-Type') ?? 'application/octet-stream',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      },
    });
  },
};
