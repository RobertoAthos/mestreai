"""add users table and project.user_id FK

Revision ID: 0002_users
Revises: 0001_initial
Create Date: 2026-05-23 17:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002_users"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=True),
        sa.Column("password_hash", sa.String(length=255), nullable=True),
        sa.Column("is_guest", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_is_guest", "users", ["is_guest"])

    # Add the FK column. Existing projects (if any) would orphan, so for the
    # MVP we delete them — the table is empty in dev and the cloud DB hasn't
    # been promoted yet.
    op.execute("DELETE FROM chat_messages")
    op.execute("DELETE FROM projects")

    op.add_column(
        "projects",
        sa.Column("user_id", sa.String(length=32), nullable=False),
    )
    op.create_foreign_key(
        "fk_projects_user_id",
        "projects",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("ix_projects_user_id", "projects", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_projects_user_id", table_name="projects")
    op.drop_constraint("fk_projects_user_id", "projects", type_="foreignkey")
    op.drop_column("projects", "user_id")

    op.drop_index("ix_users_is_guest", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
