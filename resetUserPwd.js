const admin = require('firebase-admin');
const dotenv = require('/tmp/node_modules/dotenv');
const fs = require('fs');

async function reset() {
    try {
        const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
        const rawJsonString = envConfig.FIREBASE_SERVICE_ACCOUNT_JSON;

        let clean = rawJsonString;
        if (clean.includes('\n')) {
            clean = clean.replace(/\n/g, '\\n').replace(/\r/g, '');
        }

        // Fix position 2381 error by cutting off any trailing whitespace or quotes
        const lastBrace = clean.lastIndexOf('}');
        if (lastBrace !== -1) {
            clean = clean.substring(0, lastBrace + 1);
        }

        const serviceAccount = JSON.parse(clean);

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });

        const uid = 'yojA7BFrqRMzLeeVB2ydnzS9gb62'; // abigail220795@gmail.com

        await admin.auth().updateUser(uid, {
            password: 'Temporal2026!'
        });

        console.log('Contraseña actualizada exitosamente para abigail220795@gmail.com');
        process.exit(0);
    } catch (error) {
        console.error('Error al actualizar contraseña:', error);
        process.exit(1);
    }
}

reset();
