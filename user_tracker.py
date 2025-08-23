import sqlite3
from datetime import datetime, timezone

DB_PATH = "users.db"


def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT,
            city TEXT,
            country TEXT,
            last_seen TEXT
        )
        """
    )
    conn.commit()
    return conn


def add_user(conn, name, email, city, country):
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO users (name, email, city, country, last_seen)
        VALUES (?, ?, ?, ?, ?)
        """,
        (name, email, city, country, datetime.now(timezone.utc).isoformat()),
    )
    conn.commit()


def list_users(conn):
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, name, city, country, last_seen FROM users"
    )
    return cursor.fetchall()


if __name__ == "__main__":
    connection = init_db()
    add_user(connection, "Jane Doe", "jane@example.com", "Lagos", "Nigeria")
    for user in list_users(connection):
        print(user)
    connection.close()
