import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

// Remove literal newlines if they are breaking json parse
const serviceAccountString = readFileSync('./safekey.json', 'utf8').replace(/\n(?!})/g, '\\n').replace(/\\\\n/g, '\\n');
// actually just parse it without replace because it might be valid JSON already, wait, it threw SyntaxError
// let me fix safekey.json
