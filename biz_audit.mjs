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
  const creds = {
      project_id: projectIdMatch[1],
      client_email: clientEmailMatch[1],
      private_key: privateKeyMatch[1].replace(/\\n/g, '\n')
  };

  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: creds.client_email, sub: creds.client_email,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600
  };
  const signatureInput = `${base64urlEncode(JSON.stringify(header))}.${base64urlEncode(JSON.stringify(payload))}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signatureInput);
  const jwt = `${signatureInput}.${base64urlEncode(signer.sign(creds.private_key))}`;
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}` });
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  const url = `https://firestore.googleapis.com/v1/projects/${creds.project_id}/databases/(default)/documents:runQuery`;
  
  const payloadReq = { structuredQuery: { from: [{ collectionId: 'businesses' }], limit: 100 } };
  const res = await fetch(url, { method: 'POST', headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payloadReq) });
  const bizList = await res.json();
  
  const out = bizList.filter(r => r.document).map(r => {
      let b = { _id: r.document.name.split('/').pop() };
      for (let k in r.document.fields) {
         let type = Object.keys(r.document.fields[k])[0];
         b[k] = r.document.fields[k][type];
      }
      return b;
  });

  const usaBiz = out.filter(b => b.country === 'US').slice(0, 3);
  const hnBiz = out.filter(b => b.country === 'HN').slice(0, 3);
  
  console.log("USA BUSINESSES:");
  usaBiz.forEach(b => console.log(b._id, "PaymentType/Settings:", b.paymentTypes || b.paymentSettings ? "DEFINED" : "UNDEFINED", "Settings:", JSON.stringify(b.paymentSettings)));
  
  console.log("\nHN BUSINESSES:");
  hnBiz.forEach(b => console.log(b._id, "PaymentType/Settings:", b.paymentTypes || b.paymentSettings ? "DEFINED" : "UNDEFINED", "Settings:", JSON.stringify(b.paymentSettings)));
}
runAudit().catch(console.error);
