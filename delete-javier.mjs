import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));

if (!initializeApp.apps?.length) {
    initializeApp({ credential: cert(serviceAccount) });
}

getAuth().deleteUser('pEt7D9vP4rc01fD70q6AspHJqmH3')
    .then(() => console.log('✅ Cuenta javier@apolloroofing.co ELIMINADA exitosamente de Auth.'))
    .catch((error) => console.log('Error deleting user:', error));
