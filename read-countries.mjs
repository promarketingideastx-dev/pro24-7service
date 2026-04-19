import fs from 'fs';
import crypto from 'crypto';

function base64urlEncode(str) {
  let buf = Buffer.isBuffer(str) ? str : Buffer.from(str, 'utf8');
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function read() {
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

  if (!projectIdMatch || !clientEmailMatch || !privateKeyMatch) {
      throw new Error("Could not extract credentials via regex");
  }

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
    scope: "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/cloud-platform",
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };

  const headerB64 = base64urlEncode(JSON.stringify(header));
  const payloadB64 = base64urlEncode(JSON.stringify(payload));
  const signatureInput = `${headerB64}.${payloadB64}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signatureInput);
  const signature = signer.sign(creds.private_key);
  const signatureB64 = base64urlEncode(signature);

  const jwt = `${signatureInput}.${signatureB64}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  if (!accessToken) {
    console.error("Token error:", tokenData);
    throw new Error("Failed to get accessToken");
  }

  const dbUrl = `https://firestore.googleapis.com/v1/projects/${creds.project_id}/databases/(default)/documents/crm_settings/global`;

  const getRes = await fetch(dbUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  const getData = await getRes.json();
  console.log(JSON.stringify(getData, null, 2));
}

read().catch(console.error);
