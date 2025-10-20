"""Add sanitation audit tables

Revision ID: 675214fd47f2
Revises: a224016b8261
Create Date: 2025-10-20 19:33:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '675214fd47f2'
down_revision = 'a224016b8261'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create sanitation_audits table
    op.create_table('sanitation_audits',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('branch_id', sa.Integer(), nullable=False),
        sa.Column('auditor_id', sa.Integer(), nullable=False),
        sa.Column('audit_date', sa.DateTime(), nullable=False),
        sa.Column('start_time', sa.DateTime(), nullable=False),
        sa.Column('end_time', sa.DateTime(), nullable=True),
        sa.Column('auditor_name', sa.String(length=200), nullable=False),
        sa.Column('accompanist_name', sa.String(length=200), nullable=True),
        sa.Column('total_score', sa.Float(), nullable=True),
        sa.Column('total_deductions', sa.Float(), nullable=True),
        sa.Column('status', sa.Enum('in_progress', 'completed', 'reviewed', name='auditstatus'), nullable=True),
        sa.Column('general_notes', sa.Text(), nullable=True),
        sa.Column('equipment_issues', sa.Text(), nullable=True),
        sa.Column('deficiencies_summary', sa.Text(), nullable=True),
        sa.Column('signature_url', sa.String(length=500), nullable=True),
        sa.Column('signed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['auditor_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_sanitation_audits_id'), 'sanitation_audits', ['id'], unique=False)

    # Create sanitation_audit_categories table
    op.create_table('sanitation_audit_categories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('audit_id', sa.Integer(), nullable=False),
        sa.Column('category_name', sa.String(length=200), nullable=False),
        sa.Column('category_key', sa.String(length=100), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('score_deduction', sa.Float(), nullable=True),
        sa.Column('check_performed', sa.Boolean(), nullable=True),
        sa.Column('check_name', sa.String(length=200), nullable=True),
        sa.Column('image_urls', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['audit_id'], ['sanitation_audits.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_sanitation_audit_categories_id'), 'sanitation_audit_categories', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_sanitation_audit_categories_id'), table_name='sanitation_audit_categories')
    op.drop_table('sanitation_audit_categories')
    op.drop_index(op.f('ix_sanitation_audits_id'), table_name='sanitation_audits')
    op.drop_table('sanitation_audits')
