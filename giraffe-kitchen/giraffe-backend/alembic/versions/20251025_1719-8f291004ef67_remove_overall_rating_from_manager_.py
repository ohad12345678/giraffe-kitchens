"""Remove overall_rating from manager_evaluations

Revision ID: 8f291004ef67
Revises: a32f42f65f76
Create Date: 2025-10-25 17:19:25.779192

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '8f291004ef67'
down_revision = 'a32f42f65f76'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Remove overall_rating column from manager_evaluations table
    with op.batch_alter_table('manager_evaluations', schema=None) as batch_op:
        batch_op.drop_column('overall_rating')


def downgrade() -> None:
    # Add back overall_rating column if we need to roll back
    with op.batch_alter_table('manager_evaluations', schema=None) as batch_op:
        batch_op.add_column(sa.Column('overall_rating', sa.Float(), nullable=True))
