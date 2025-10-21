"""Add manager reviews table

Revision ID: 8f9a3b2c1d4e
Revises: ac919eceee26
Create Date: 2025-10-21 21:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '8f9a3b2c1d4e'
down_revision = 'ac919eceee26'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # SQLite doesn't support CREATE TYPE - enums stored as strings
    # Create manager_reviews table
    op.create_table('manager_reviews',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('manager_id', sa.Integer(), nullable=False),
        sa.Column('branch_id', sa.Integer(), nullable=False),
        sa.Column('reviewer_id', sa.Integer(), nullable=False),

        # Review period
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('quarter', sa.String(length=2), nullable=False),  # Q1, Q2, Q3, Q4
        sa.Column('review_date', sa.Date(), nullable=False),

        # Status
        sa.Column('status', sa.String(length=20), nullable=False),  # draft, submitted, completed

        # 1. Operational Management (35%)
        sa.Column('operational_score', sa.Float(), nullable=True),
        sa.Column('sanitation_score', sa.Float(), nullable=True),
        sa.Column('sanitation_comments', sa.Text(), nullable=True),
        sa.Column('inventory_score', sa.Float(), nullable=True),
        sa.Column('inventory_comments', sa.Text(), nullable=True),
        sa.Column('quality_score', sa.Float(), nullable=True),
        sa.Column('quality_comments', sa.Text(), nullable=True),
        sa.Column('maintenance_score', sa.Float(), nullable=True),
        sa.Column('maintenance_comments', sa.Text(), nullable=True),

        # 2. People Management (30%)
        sa.Column('people_score', sa.Float(), nullable=True),
        sa.Column('recruitment_score', sa.Float(), nullable=True),
        sa.Column('recruitment_comments', sa.Text(), nullable=True),
        sa.Column('scheduling_score', sa.Float(), nullable=True),
        sa.Column('scheduling_comments', sa.Text(), nullable=True),
        sa.Column('retention_score', sa.Float(), nullable=True),
        sa.Column('retention_comments', sa.Text(), nullable=True),

        # 3. Business Performance (25%)
        sa.Column('business_score', sa.Float(), nullable=True),
        sa.Column('sales_score', sa.Float(), nullable=True),
        sa.Column('sales_comments', sa.Text(), nullable=True),
        sa.Column('efficiency_score', sa.Float(), nullable=True),
        sa.Column('efficiency_comments', sa.Text(), nullable=True),

        # 4. Leadership & Personal Development (10%)
        sa.Column('leadership_score', sa.Float(), nullable=True),
        sa.Column('leadership_comments', sa.Text(), nullable=True),

        # Overall score
        sa.Column('overall_score', sa.Float(), nullable=True),

        # Auto-populated data from system
        sa.Column('auto_sanitation_avg', sa.Float(), nullable=True),
        sa.Column('auto_dish_checks_avg', sa.Float(), nullable=True),
        sa.Column('auto_sanitation_count', sa.Integer(), nullable=True),
        sa.Column('auto_dish_checks_count', sa.Integer(), nullable=True),

        # Development plan
        sa.Column('development_goals', sa.Text(), nullable=True),  # JSON stored as text for SQLite
        sa.Column('next_review_targets', sa.Text(), nullable=True),  # JSON stored as text for SQLite

        # AI Analysis
        sa.Column('ai_analysis', sa.Text(), nullable=True),  # JSON stored as text for SQLite
        sa.Column('ai_summary', sa.Text(), nullable=True),

        # Metadata
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('submitted_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),

        # Foreign keys
        sa.ForeignKeyConstraint(['manager_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['reviewer_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_manager_reviews_id'), 'manager_reviews', ['id'], unique=False)
    op.create_index('ix_manager_reviews_manager_id', 'manager_reviews', ['manager_id'], unique=False)
    op.create_index('ix_manager_reviews_branch_id', 'manager_reviews', ['branch_id'], unique=False)
    op.create_index('ix_manager_reviews_year_quarter', 'manager_reviews', ['year', 'quarter'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_manager_reviews_year_quarter', table_name='manager_reviews')
    op.drop_index('ix_manager_reviews_branch_id', table_name='manager_reviews')
    op.drop_index('ix_manager_reviews_manager_id', table_name='manager_reviews')
    op.drop_index(op.f('ix_manager_reviews_id'), table_name='manager_reviews')
    op.drop_table('manager_reviews')
    # SQLite doesn't use explicit enum types
