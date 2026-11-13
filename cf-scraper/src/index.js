// Probe: can a Cloudflare Worker read fabtcg.com coverage pages?
// GET /?slug=<coverage-slug>[&path=standings/1/]
export default {
  async fetch(request) {
    const q = new URL(request.url).searchParams;
    const slug = (q.get('slug') || 'calling-valencia').replace(/[^a-z0-9-]/gi, '');
    const sub  = (q.get('path') || '').replace(/[^a-z0-9/-]/gi, '');
    const target = `https://fabtcg.com/coverage/${slug}/${sub}`;
    const t0 = Date.now();
    let res, body = '';
    try {
      res = await fetch(target, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        redirect: 'follow',
      });
      body = await res.text();
    } catch (e) {
      return Response.json({ target, error: String(e) }, { status: 502 });
    }
    return Response.json({
      target,
      ms: Date.now() - t0,
      status: res.status,
      cfMitigated: res.headers.get('cf-mitigated'),
      server: res.headers.get('server'),
      title: (body.match(/<title>([^<]*)/i) || [])[1] || null,
      challenge: /challenge-platform|cf_chl|Just a moment/i.test(body),
      tableRows: (body.match(/<tr[\s>]/gi) || []).length,
      length: body.length,
      snippet: body.slice(0, 400),
    }, { headers: { 'Access-Control-Allow-Origin': '*' } });
  },
};
