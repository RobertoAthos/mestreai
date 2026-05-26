"""add chat_memory column to projects

Revision ID: 0003_chat_memory
Revises: 0002_users
Create Date: 2026-05-25 12:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003_chat_memory"
down_revision: Union[str, None] = "0002_users"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "projects",
        sa.Column("chat_memory", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("projects", "chat_memory")
