const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/FIREBASE_SERVICE_ACCOUNT_JSON="(.*)"/s);
if (match) {
    let str = match[1];
    str = str.replace(/\\n/g, '\n').replace(/\\"/g, '"');
    fs.writeFileSync('safekey.json', str);
    console.log("Saved safekey.json");
} else {
    console.log("Not found");
}
