from db import get_connection

def init_db():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS call_analysis (
            id TEXT PRIMARY KEY,
            created_at TEXT,
            audio_filename TEXT,

            verdict TEXT,
            final_sentiment REAL,

            call_summary TEXT,
            full_result_json TEXT
        )
    """)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized")
