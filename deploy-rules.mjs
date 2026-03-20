import https from 'https';
import fs from 'fs';
import { google } from 'googleapis';
import { readFileSync } from 'fs';

const serviceAccountConfig = './serviceAccountKey.json';
const serviceAccount = JSON.parse(readFileSync(serviceAccountConfig, 'utf8'));

async function deployRules() {
    try {
        console.log('1. Autenticando vía JWT con la llave de servicio...');
        const jwtClient = new google.auth.JWT(
            serviceAccount.client_email,
            null,
            serviceAccount.private_key,
            ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/datastore']
        );
        
        await jwtClient.authorize();
        const token = jwtClient.credentials.access_token;
        console.log('✅ Token obtenido.');

        const rulesContent = fs.readFileSync('./firestore.rules', 'utf8');
        const projectId = serviceAccount.project_id;
        
        console.log(`2. Desplegando reglas al proyecto: ${projectId}...`);
        
        const data = JSON.stringify({
            rules: {
                files: [
                    {
                        name: 'firestore.rules',
                        content: rulesContent
                    }
                ]
            }
        });

        const options = {
            hostname: 'firebaserules.googleapis.com',
            port: 443,
            path: `/v1/projects/${projectId}/releases`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Content-Length': data.length
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (d) => body += d);
            res.on('end', async () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                     const response = JSON.parse(body);
                     console.log('✅ Rules creadas (Release Header). Intentando parchear Release...');
                     // Actually deploying the ruleset to firestore.googleapis.com
                     await attachRulesetToFirestore(token, projectId, response.rulesetName || response.name);
                } else {
                     // Try creating ruleset first
                     await createAndDeployRuleset(token, projectId, rulesContent);
                }
            });
        });

        req.on('error', (error) => {
             console.error('❌ Error de red:', error);
        });

        req.write(data);
        req.end();

    } catch (e) {
        console.error('❌ Error general:', e);
    }
}

async function createAndDeployRuleset(token, projectId, rulesContent) {
     return new Promise((resolve, reject) => {
          const rulesetData = JSON.stringify({
              source: {
                  files: [{ name: 'firestore.rules', content: rulesContent }]
              }
          });
          
          const createOptions = {
              hostname: 'firebaserules.googleapis.com',
              port: 443,
              path: `/v1/projects/${projectId}/rulesets`,
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                  'Content-Length': rulesetData.length
              }
          };

          const req = https.request(createOptions, (res) => {
              let body = '';
              res.on('data', d => body += d);
              res.on('end', async () => {
                   if (res.statusCode === 200) {
                        const parsed = JSON.parse(body);
                        console.log(`✅ Ruleset Creado: ${parsed.name}`);
                        await attachRulesetToFirestore(token, projectId, parsed.name);
                        resolve();
                   } else {
                        console.log('Failed to create ruleset:', body);
                        reject(body);
                   }
              });
          });
          req.write(rulesetData);
          req.end();
     });
}

async function attachRulesetToFirestore(token, projectId, rulesetName) {
    return new Promise((resolve, reject) => {
        const releaseData = JSON.stringify({
            release: {
                name: `projects/${projectId}/releases/cloud.firestore`,
                rulesetName: rulesetName
            }
        });
        
        const releaseOptions = {
            hostname: 'firebaserules.googleapis.com',
            port: 443,
            path: `/v1/projects/${projectId}/releases/cloud.firestore`,
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Content-Length': releaseData.length
            }
        };

        const releaseReq = https.request(releaseOptions, (res) => {
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => {
                if (res.statusCode === 200) {
                     console.log('🚀 ¡REGLAS DE FIRESTORE DESPLEGADAS CON ÉXITO A PRODUCCIÓN!');
                     resolve();
                } else {
                     console.log('Error asignando ruleset a release:', body);
                     reject();
                }
            });
        });
        releaseReq.write(releaseData);
        releaseReq.end();
    });
}

deployRules();
