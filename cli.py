import os, sqlite3, smtplib, logging, argparse
from contextlib import closing
from email.message import EmailMessage
from dotenv import load_dotenv

def get_args():
    p = argparse.ArgumentParser()
    p.add_argument("--name", required=True, help="Full name of user to add")
    p.add_argument("--notify", choices=["auto","on","off"], default="auto")
    p.add_argument("--db", default="users.db")
    p.add_argument("--verbose", action="store_true")
    return p.parse_args()

def ensure_schema(conn):
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("""
      CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    """)

def add_user(conn, name):
    conn.execute("INSERT OR IGNORE INTO users(name) VALUES (?)", (name,))
    return conn.total_changes  # 1 if inserted, 0 if duplicate

def can_send(notify_mode, user, pwd):
    if notify_mode == "off":
        return False, "suppressed by flag"
    if notify_mode == "on":
        if not user or not pwd:
            raise RuntimeError("SMTP credentials required when --notify=on")
        return True, "forced by flag"
    # auto
    return bool(user and pwd), "auto mode"

def send_email(smtp_user, smtp_pass, recipient, subject, body):
    msg = EmailMessage()
    msg["From"] = smtp_user
    msg["To"] = recipient
    msg["Subject"] = subject
    msg.set_content(body)
    with smtplib.SMTP("smtp.gmail.com", 587, timeout=15) as s:
        s.starttls()
        s.login(smtp_user, smtp_pass)
        s.send_message(msg)

def main():
    args = get_args()
    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO,
                        format="%(levelname)s %(message)s")
    load_dotenv()
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")

    with closing(sqlite3.connect(args.db)) as conn, conn:
        ensure_schema(conn)
        wrote = add_user(conn, args.name)

    ok, reason = can_send(args.notify, smtp_user, smtp_pass)
    if wrote == 0:
        logging.info("User already exists. rows_written=0 email_sent=false")
        return

    if not ok:
        logging.info(f"Added user. rows_written=1 email_sent=false reason='{reason}'")
        print("Skipping email notification; SMTP credentials not configured.")
        return

    try:
        send_email(smtp_user, smtp_pass,
                   recipient=os.getenv("ALERT_TO", smtp_user),
                   subject=f"New user added: {args.name}",
                   body=f"{args.name} was added to the database.")
        logging.info("Added user. rows_written=1 email_sent=true")
    except Exception as e:
        logging.error(f"Email send failed: {e}")
        print("Added user, but email failed. Check logs.")

if __name__ == "__main__":
    main()
