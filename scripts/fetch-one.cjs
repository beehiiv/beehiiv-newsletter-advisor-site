const fs = require('fs');
const https = require('https');
const slug = process.argv[2];
if (!slug) { console.log('Usage: node fetch-one.cjs <slug>'); process.exit(1); }

const body = JSON.stringify({database:2,type:'native',native:{query:`SELECT pp.html FROM post_previews pp JOIN posts p ON p.id = pp.post_id WHERE p.slug = '${slug}' LIMIT 1`}});
const req = https.request({
  hostname:'beehiiv.metabaseapp.com', path:'/api/dataset', method:'POST',
  headers:{'Content-Type':'application/json','X-Metabase-Session':'c1d959f2-5e24-41c8-be07-4e3c65d54c4e','Content-Length':Buffer.byteLength(body)},
  timeout:60000
}, res => {
  let data='';
  res.on('data',c=>data+=c);
  res.on('end',()=>{
    const html = JSON.parse(data).data?.rows?.[0]?.[0];
    if (!html) { console.log('No HTML found for', slug); process.exit(1); }
    const clean = html.replace(/\{\{[A-Z_]+\}\}/g, '');
    fs.writeFileSync(`public/emails/${slug}.html`, clean);
    console.log('Saved! Length:', clean.length);
  });
});
req.on('error',e=>console.error(e));
req.write(body);
req.end();
