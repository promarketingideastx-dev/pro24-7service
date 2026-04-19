import fs from 'fs';
import crypto from 'crypto';

function base64urlEncode(str) {
  let buf = Buffer.isBuffer(str) ? str : Buffer.from(str, 'utf8');
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function runAudit() {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  let serviceAccountStr = '';
  for (const line of envContent.split('\n')) {
    if (line.startsWith('FIREBASE_SERVICE_ACCOUNT_JSON=')) {
      serviceAccountStr = line.substring('FIREBASE_SERVICE_ACCOUNT_JSON='.length);
      break;
    }
  }

  const projectIdMatch = serviceAccountStr.match(/"project_id"\s*:\s*"([^"]+)"/);
  const clientEmailMatch = serviceAccountStr.match(/"client_email"\s*:\s*"([^"]+)"/);
  const privateKeyMatch = serviceAccountStr.match(/"private_key"\s*:\s*"([^"]+)"/);

  if (!projectIdMatch || !clientEmailMatch || !privateKeyMatch) throw new Error("Could not extract credentials");

  const creds = {
      project_id: projectIdMatch[1],
      client_email: clientEmailMatch[1],
      private_key: privateKeyMatch[1].replace(/\\n/g, '\n')
  };

  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: creds.client_email,
    sub: creds.client_email,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };

  const signatureInput = `${base64urlEncode(JSON.stringify(header))}.${base64urlEncode(JSON.stringify(payload))}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signatureInput);
  const signatureB64 = base64urlEncode(signer.sign(creds.private_key));
  const jwt = `${signatureInput}.${signatureB64}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;
  
  if(!accessToken) {
     console.error("Token err:", tokenData);
     return;
  }

  // Helper to fetch from firestore
  const queryDB = async (collection, limit) => {
    const url = `https://firestore.googleapis.com/v1/projects/${creds.project_id}/databases/(default)/documents:runQuery`;
    const payload = {
      structuredQuery: {
        from: [{ collectionId: collection }],
        limit: limit
      }
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    return result.filter(r => r.document).map(r => {
      // simplify document format
      let out = { _id: r.document.name.split('/').pop() };
      for (let k in r.document.fields) {
         let type = Object.keys(r.document.fields[k])[0];
         out[k] = r.document.fields[k][type];
      }
      return out;
    });
  };

  const users = await queryDB('users', 20);
  const biz = await queryDB('businesses_public', 20); // wait, businesses_public or businesses? Check rules: match /businesses/{businessId} exists, but also businesses_public/private.
  const actualBiz = await queryDB('businesses', 40);
  const bookings = await queryDB('bookings', 30);
  
  console.log('--- FOUND BOOKINGS (' + bookings.length + ') ---');
  bookings.filter(b=>b.currency).slice(0, 10).forEach(b => {
      console.log(`Booking ${b._id} | Stat: ${b.status} | PayStat: ${b.paymentStatus} | Curr: ${b.currency} | Biz: ${b.businessId}`);
  });
  
  console.log('\n--- BIZ PAYMENT SETTINGS ---');
  actualBiz.filter(b=>b.country).forEach(b => {
      let bCountry = b.country;
      let pSet = b.paymentSettings || b.paymentTypes || "none";
      console.log(`Biz ${b._id} | Country: ${bCountry} | PaySettings:`, JSON.stringify(pSet));
  });

}
runAudit().catch(console.error);
