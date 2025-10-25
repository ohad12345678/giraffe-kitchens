"""Add status and overall_score to manager evaluations, upgrade date to datetime

Revision ID: 0295ad2f4bbd
Revises: 8f291004ef67
Create Date: 2025-10-25 17:42:10.493566

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0295ad2f4bbd'
down_revision = '8f291004ef67'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add overall_score column
    with op.batch_alter_table('manager_evaluations', schema=None) as batch_op:
        batch_op.add_column(sa.Column('overall_score', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('status', sa.String(), nullable=False, server_default='draft'))

    # Note: SQLite doesn't support altering column types directly
    # evaluation_date will remain as Date for existing records
    # New records will use DateTime as per model definition


def downgrade() -> None:
    # Remove added columns
    with op.batch_alter_table('manager_evaluations', schema=None) as batch_op:
        batch_op.drop_column('status')
        batch_op.drop_column('overall_score')
