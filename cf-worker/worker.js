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

    const targetUrl = new URL(request.url).searchParams.get('url');

    if (!targetUrl) {
      return new Response('Missing ?url= parameter', { status: 400 });
    }

    const ALLOWED_URLS = [
      'https://alerts.ncdr.nat.gov.tw/RssAtomFeed.ashx?AlertType=33',
      'https://alerts.ncdr.nat.gov.tw/DownLoadNewAssistData.ashx/81',
    ];

    if (!ALLOWED_URLS.includes(targetUrl)) {
      return new Response('Forbidden: URL not in allowlist', { status: 403 });
    }

    const res = await fetch(targetUrl);
    const body = await res.arrayBuffer();

    return new Response(body, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('Content-Type') ?? 'application/octet-stream',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
      },
    });
  },
};
