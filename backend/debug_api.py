import requests
import json

url = "https://data.gov.au/data/api/3/action/datastore_search"
resource_id = "33673aca-0857-42e5-b8f0-9981b4755686"
params = {
    "resource_id": resource_id,
    "limit": 5
}

response = requests.get(url, params=params)
print(f"Status: {response.status_code}")
if response.status_code == 200:
    print(json.dumps(response.json(), indent=2))
else:
    print(response.text)
