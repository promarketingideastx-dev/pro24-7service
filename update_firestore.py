import json
import urllib.request
import os
import time
import base64
import hmac
import hashlib

def base64url_encode(data):
    if isinstance(data, str): data = data.encode('utf-8')
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')

# Read env file directly (hack implementation since I know where it is)
env_path = ".env.local"
service_account_str = ""
with open(env_path, "r") as f:
    for line in f:
        if line.startswith("FIREBASE_SERVICE_ACCOUNT_JSON="):
            service_account_str = line.split("FIREBASE_SERVICE_ACCOUNT_JSON=")[1].strip()
            # remove outer quotes
            if service_account_str.startswith('"') and service_account_str.endswith('"'):
                service_account_str = service_account_str[1:-1]
            service_account_str = service_account_str.replace('\\n', '\n')
            break

creds = json.loads(service_account_str)

header = {"alg": "RS256", "typ": "JWT"}
now = int(time.time())
payload = {
    "iss": creds["client_email"],
    "sub": creds["client_email"],
    "aud": "https://oauth2.googleapis.com/token",
    "iat": now,
    "exp": now + 3600
}

header_b64 = base64url_encode(json.dumps(header))
payload_b64 = base64url_encode(json.dumps(payload))
signature_input = header_b64 + "." + payload_b64

# Write temporary python script with PyCryptodome or just use bash openssl
import subprocess
with open("jwt_input.txt", "w") as f:
    f.write(signature_input)

with open("private_key.pem", "w") as f:
    f.write(creds["private_key"])

# using openssl to sign since the default python might lack cryptography module
subprocess.run("openssl dgst -sha256 -sign private_key.pem -out signature.bin jwt_input.txt", shell=True, check=True)

with open("signature.bin", "rb") as f:
    signature_b64 = base64url_encode(f.read())

jwt = signature_input + "." + signature_b64

data = urllib.parse.urlencode({
    "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
    "assertion": jwt
}).encode('utf-8')

req = urllib.request.Request("https://oauth2.googleapis.com/token", data=data)
with urllib.request.urlopen(req) as response:
    token_info = json.loads(response.read().decode('utf-8'))
    access_token = token_info["access_token"]

project_id = creds["project_id"]
db_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents/crm_settings/global?updateMask.fieldPaths=activeCountries"

update_payload = json.dumps({
    "fields": {
        "activeCountries": {
            "arrayValue": {
                "values": [
                    {"stringValue": "HN"},
                    {"stringValue": "US"}
                ]
            }
        }
    }
}).encode('utf-8')

req = urllib.request.Request(db_url, data=update_payload, method="PATCH", headers={
    "Authorization": "Bearer " + access_token,
    "Content-Type": "application/json"
})

with urllib.request.urlopen(req) as response:
    print(response.read().decode('utf-8'))

os.remove("jwt_input.txt")
os.remove("private_key.pem")
os.remove("signature.bin")
