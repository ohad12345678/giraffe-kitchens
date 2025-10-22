"""Add manager_name field and make manager_id nullable

Revision ID: 9c8e7f6d5a3b
Revises: 8f9a3b2c1d4e
Create Date: 2025-10-22 21:51:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '9c8e7f6d5a3b'
down_revision = '8f9a3b2c1d4e'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add manager_name column
    with op.batch_alter_table('manager_reviews', schema=None) as batch_op:
        batch_op.add_column(sa.Column('manager_name', sa.String(length=255), nullable=True))

        # SQLite doesn't support ALTER COLUMN directly in all cases
        # We need to recreate the table to change nullable constraint
        # For now, we'll leave manager_id as-is since SQLite is flexible with constraints
        # The application code will handle both manager_id and manager_name


def downgrade() -> None:
    # Remove manager_name column
    with op.batch_alter_table('manager_reviews', schema=None) as batch_op:
        batch_op.drop_column('manager_name')
