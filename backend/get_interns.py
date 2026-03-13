import sqlite3
conn = sqlite3.connect('db.sqlite3')
cur = conn.cursor()
cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
rows = cur.fetchall()
for r in rows:
    print(r)
print("Finished!")
