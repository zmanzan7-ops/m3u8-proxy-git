export default async function handler(req, res) {
  // إعدادات CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).send('Missing url parameter');
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        'Origin': new URL(targetUrl).origin,
        'Referer': new URL(targetUrl).origin + '/'
      }
    });

    const contentType = response.headers.get('content-type') || '';

    if (targetUrl.includes('.m3u8') || contentType.includes('mpegurl')) {
      let text = await response.text();
      const baseUrl = new URL(targetUrl);
      const basePath = baseUrl.href.substring(0, baseUrl.href.lastIndexOf('/') + 1);

      // إعادة كتابة الروابط الداخلية لتشير إلى الوسيط
      text = text.replace(/^(?!#)(.+)$/gm, (match) => {
        let absoluteUrl;
        if (match.startsWith('http')) {
          absoluteUrl = match;
        } else {
          absoluteUrl = new URL(match, basePath).href;
        }
        const protocol = req.headers.host.includes('localhost') ? 'http' : 'https';
        return `${protocol}://${req.headers.host}/api/proxy?url=${encodeURIComponent(absoluteUrl)}`;
      });

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      return res.status(200).send(text);
    }

    // تمرير مقاطع الفيديو (.ts) مباشرة
    res.setHeader('Content-Type', contentType || 'video/mp2t');
    const buffer = Buffer.from(await response.arrayBuffer());
    return res.status(200).send(buffer);

  } catch (error) {
    return res.status(500).send('Proxy Error: ' + error.message);
  }
}
