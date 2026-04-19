import fs from 'fs';
import crypto from 'crypto';

function base64urlEncode(str) {
  let buf = Buffer.isBuffer(str) ? str : Buffer.from(str, 'utf8');
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function deploy() {
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
    scope: "https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/cloud-platform",
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

  if (!accessToken) throw new Error("Failed to get accessToken");

  const rulesContent = fs.readFileSync('firestore.rules', 'utf8');

  // Create ruleset
  const rulesetPayload = {
    source: {
      files: [{ name: "firestore.rules", content: rulesContent }]
    }
  };

  const rulesetRes = await fetch(`https://firebaserules.googleapis.com/v1/projects/${creds.project_id}/rulesets`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(rulesetPayload)
  });
  const rulesetData = await rulesetRes.json();
  console.log("Ruleset created:", rulesetData.name);

  // Update release to point to new ruleset
  const releasePayload = {
    release: {
      name: `projects/${creds.project_id}/releases/cloud.firestore`,
      rulesetName: rulesetData.name
    }
  };

  const releaseRes = await fetch(`https://firebaserules.googleapis.com/v1/projects/${creds.project_id}/releases/cloud.firestore`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(releasePayload)
  });
  const releaseData = await releaseRes.json();
  console.log("Deployed release!", releaseData);
}

deploy().catch(console.error);
