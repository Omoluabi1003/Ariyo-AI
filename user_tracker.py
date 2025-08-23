import os
import smtplib
import sqlite3
from datetime import datetime, timezone
from email.message import EmailMessage

DB_PATH = "users.db"
# Email address to receive notifications when a new user is added
NOTIFY_EMAIL = "pakiyogun10@gmail.com"


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
    send_notification(name, email)


def list_users(conn):
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, name, city, country, last_seen FROM users"
    )
    return cursor.fetchall()


def send_notification(name: str, email: str) -> None:
    """Send an email notification when a user is added.

    SMTP credentials are read from the ``SMTP_USER`` and ``SMTP_PASS``
    environment variables. If they are not set, the notification is skipped.
    """

    sender = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASS")
    if not sender or not password:
        print("Skipping email notification; SMTP credentials not configured.")
        return

    message = EmailMessage()
    message["Subject"] = f"New user added: {name}"
    message["From"] = sender
    message["To"] = NOTIFY_EMAIL
    message.set_content(f"{name} <{email}> was added to the user tracker.")

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
        smtp.login(sender, password)
        smtp.send_message(message)


if __name__ == "__main__":
    connection = init_db()
    add_user(connection, "Jane Doe", "jane@example.com", "Lagos", "Nigeria")
    for user in list_users(connection):
        print(user)
    connection.close()
