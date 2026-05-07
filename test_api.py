import requests
import json

# Test the mock extraction endpoint by navigating to the actions API
try:
    response = requests.get(
        "http://localhost:8000/api/actions/mock-doc-001"
    )
    data = response.json()
    print(json.dumps(data, indent=2))
except Exception as e:
    print(f"Error: {e}")
