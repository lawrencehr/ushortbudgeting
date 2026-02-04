import requests
import json

url = "https://data.gov.au/data/api/3/action/datastore_search"
resource_id = "33673aca-0857-42e5-b8f0-9981b4755686"
params = {
    "resource_id": resource_id,
    "limit": 1000
}

response = requests.get(url, params=params)
if response.status_code == 200:
    records = response.json()["result"]["records"]
    nsw_2026 = [r for r in records if r.get("Jurisdiction", "").lower() == "nsw" and "2026" in r.get("Date", "")]
    print(f"Found {len(nsw_2026)} NSW 2026 holidays.")
    for h in nsw_2026:
        print(f"{h['Date']}: {h['Holiday Name']}")
else:
    print(response.text)
