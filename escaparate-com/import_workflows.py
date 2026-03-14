import os
import json
import urllib.request
import urllib.parse

API_URL = "http://localhost:5678/api/v1/workflows"
WORKFLOWS_DIR = "/opt/fabrica/escaparate-com/n8n-workflows"

headers = {
    "Accept": "application/json",
    "Content-Type": "application/json"
}

files_to_import = [
    "router.json",
    "cliente-nuevo.json",
    "cliente-existente.json",
    "candidato.json"
]

for filename in files_to_import:
    filepath = os.path.join(WORKFLOWS_DIR, filename)
    if not os.path.exists(filepath):
        print(f"File not found: {filename}")
        continue
        
    with open(filepath, "r") as f:
        workflow_data = json.load(f)
        
    req = urllib.request.Request(API_URL, data=json.dumps(workflow_data).encode("utf-8"), headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            wf_id = res_data.get("id")
            print(f"Successfully imported {filename}, ID: {wf_id}")
            
            # Activate it
            activate_url = f"{API_URL}/{wf_id}"
            activate_data = json.dumps({"active": True}).encode("utf-8")
            act_req = urllib.request.Request(activate_url, data=activate_data, headers=headers, method="PATCH")
            try:
                with urllib.request.urlopen(act_req) as act_resp:
                    print(f"  -> Activated {filename}")
            except Exception as e:
                print(f"  -> Failed to activate {filename}: {e}")
                
    except urllib.error.HTTPError as e:
        print(f"Failed to import {filename}: {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"Error importing {filename}: {e}")
