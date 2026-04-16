import gspread
import json
from google.oauth2.service_account import Credentials

scopes = [
    "https://www.googleapis.com/auth/spreadsheets.readonly"
]

creds = Credentials.from_service_account_file('ojt_backend/google_credentials.json', scopes=scopes)
client = gspread.authorize(creds)

try:
    spreadsheet_id = "1Is22e9YR8yH6EfNfVXRuztGwcoitJEM_NEKqNT3wcB0"
    sheet = client.open_by_key(spreadsheet_id).get_worksheet(0)
    data = sheet.get_all_values()
    with open('sheet_dump.json', 'w') as f:
        json.dump(data, f)
    print(f"Dumped {len(data)} rows.")
except Exception as e:
    print(f"Error: {e}")
