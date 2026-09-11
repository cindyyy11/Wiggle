"""PIN is a shared-device gate, additional to authenticated household ownership.

SQLite serializes attempts across workers on one host. Deployments with multiple hosts
must supply a shared rate-limit/ticket store before enabling parent access there.
"""

import hashlib
import hmac
import secrets
import sqlite3
import time
from collections.abc import Callable, Iterator
from contextlib import contextmanager

from app.repositories.protocols import WiggleRepository
from app.services.sessions import WorkflowError


def hash_pin(pin: str) -> str:
    salt = secrets.token_hex(16)
    # OWASP's 16 MiB / p=5 scrypt profile balances PIN verification cost and memory.
    digest = hashlib.scrypt(pin.encode(), salt=salt.encode(), n=16384, r=8, p=5).hex()
    return f"scrypt$16384$8$5${salt}${digest}"


def verify_pin(pin: str, encoded: str) -> bool:
    try:
        algorithm, n, r, p, salt, expected = encoded.split("$")
        if (algorithm, n, r, p) != ("scrypt", "16384", "8", "5") or len(salt) != 32:
            return False
        actual = hashlib.scrypt(pin.encode(), salt=salt.encode(), n=16384, r=8, p=5).hex()
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


class PinStore:
    def __init__(self, path: str) -> None:
        self.path = path
        with self.transaction() as connection:
            connection.execute(
                "CREATE TABLE IF NOT EXISTS attempts "
                "(owner TEXT PRIMARY KEY, failures INTEGER, blocked REAL)"
            )
            connection.execute(
                "CREATE TABLE IF NOT EXISTS tickets "
                "(digest TEXT PRIMARY KEY, owner TEXT, expires REAL)"
            )

    @contextmanager
    def transaction(self) -> Iterator[sqlite3.Connection]:
        connection = sqlite3.connect(self.path, timeout=10, isolation_level=None)
        try:
            connection.execute("BEGIN IMMEDIATE")
            yield connection
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()


class ParentPinService:
    def __init__(
        self, repository: WiggleRepository, store: PinStore, clock: Callable[[], float] = time.time
    ) -> None:
        self.repository = repository
        self.store = store
        self.clock = clock

    def setup(self, pin: str) -> str:
        with self.store.transaction():
            settings = self.repository.get_settings() or {}
            if settings.get("pin_hash"):
                raise WorkflowError("pin_already_set", "PIN already configured", 409)
            self.repository.put_settings({**settings, "pin_hash": hash_pin(pin)})
        return self.verify(pin)

    def verify(self, pin: str) -> str:
        owner, now = self.repository.owner_id, self.clock()
        error: WorkflowError | None = None
        ticket = ""
        with self.store.transaction() as connection:
            row = connection.execute(
                "SELECT failures, blocked FROM attempts WHERE owner=?", (owner,)
            ).fetchone()
            failures, blocked = row if row else (0, 0)
            if blocked > now:
                error = WorkflowError("pin_locked", "Try again in 5 minutes", 429)
            else:
                if blocked:
                    failures = 0
                encoded = str((self.repository.get_settings() or {}).get("pin_hash", ""))
                if not encoded:
                    error = WorkflowError("pin_setup_required", "Set a parent PIN first", 409)
                elif not verify_pin(pin, encoded):
                    failures += 1
                    connection.execute(
                        "INSERT OR REPLACE INTO attempts VALUES (?, ?, ?)",
                        (owner, failures, now + 300 if failures >= 5 else 0),
                    )
                    error = WorkflowError(
                        "pin_locked" if failures >= 5 else "pin_invalid",
                        "PIN was not accepted",
                        429 if failures >= 5 else 403,
                    )
                else:
                    connection.execute("DELETE FROM attempts WHERE owner=?", (owner,))
                    connection.execute("DELETE FROM tickets WHERE expires <= ?", (now,))
                    ticket = secrets.token_urlsafe(32)
                    connection.execute(
                        "INSERT INTO tickets VALUES (?, ?, ?)",
                        (self.digest(ticket), owner, now + 900),
                    )
        # Raise after commit so failed attempts cannot roll back their own throttle.
        if error:
            raise error
        return ticket

    @staticmethod
    def digest(ticket: str) -> str:
        return hashlib.sha256(ticket.encode()).hexdigest()

    def require(self, ticket: str | None) -> None:
        with self.store.transaction() as connection:
            row = connection.execute(
                "SELECT owner, expires FROM tickets WHERE digest=?", (self.digest(ticket or ""),)
            ).fetchone()
        if not row or row[0] != self.repository.owner_id or row[1] <= self.clock():
            raise WorkflowError("parent_pin_required", "Enter your parent PIN", 403)

    def revoke(self, ticket: str) -> None:
        with self.store.transaction() as connection:
            connection.execute(
                "DELETE FROM tickets WHERE digest=? AND owner=?",
                (self.digest(ticket), self.repository.owner_id),
            )
