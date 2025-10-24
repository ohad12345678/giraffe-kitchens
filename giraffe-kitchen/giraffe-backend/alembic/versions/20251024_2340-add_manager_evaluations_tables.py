"""Add manager evaluations tables

Revision ID: add_manager_evaluations
Revises: ac919eceee26
Create Date: 2025-10-24 23:40:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_manager_evaluations'
down_revision = 'ac919eceee26'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create manager_evaluations table
    op.create_table('manager_evaluations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('manager_id', sa.Integer(), nullable=False),
        sa.Column('branch_id', sa.Integer(), nullable=False),
        sa.Column('evaluator_id', sa.Integer(), nullable=False),
        sa.Column('evaluation_period_start', sa.Date(), nullable=False),
        sa.Column('evaluation_period_end', sa.Date(), nullable=False),
        sa.Column('status', sa.Enum('draft', 'completed', 'approved', name='evaluationstatus'), nullable=False),
        sa.Column('operational_management_score', sa.Float(), nullable=True),
        sa.Column('operational_management_feedback', sa.Text(), nullable=True),
        sa.Column('people_management_score', sa.Float(), nullable=True),
        sa.Column('people_management_feedback', sa.Text(), nullable=True),
        sa.Column('business_performance_score', sa.Float(), nullable=True),
        sa.Column('business_performance_feedback', sa.Text(), nullable=True),
        sa.Column('leadership_score', sa.Float(), nullable=True),
        sa.Column('leadership_feedback', sa.Text(), nullable=True),
        sa.Column('overall_assessment', sa.Text(), nullable=True),
        sa.Column('strengths', sa.Text(), nullable=True),
        sa.Column('areas_for_improvement', sa.Text(), nullable=True),
        sa.Column('action_items', sa.Text(), nullable=True),
        sa.Column('total_score', sa.Float(), nullable=True),
        sa.Column('performance_level', sa.Enum('outstanding', 'exceeds_expectations', 'meets_expectations', 'needs_improvement', 'does_not_meet', name='performancelevel'), nullable=True),
        sa.Column('ai_analysis', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('approved_at', sa.DateTime(), nullable=True),
        sa.Column('approved_by_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['approved_by_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ),
        sa.ForeignKeyConstraint(['evaluator_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['manager_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_manager_evaluations_branch_id'), 'manager_evaluations', ['branch_id'], unique=False)
    op.create_index(op.f('ix_manager_evaluations_created_at'), 'manager_evaluations', ['created_at'], unique=False)
    op.create_index(op.f('ix_manager_evaluations_id'), 'manager_evaluations', ['id'], unique=False)
    op.create_index(op.f('ix_manager_evaluations_manager_id'), 'manager_evaluations', ['manager_id'], unique=False)
    op.create_index(op.f('ix_manager_evaluations_status'), 'manager_evaluations', ['status'], unique=False)

    # Create evaluation_categories table
    op.create_table('evaluation_categories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('evaluation_id', sa.Integer(), nullable=False),
        sa.Column('category_name', sa.String(100), nullable=False),
        sa.Column('score', sa.Float(), nullable=False),
        sa.Column('feedback', sa.Text(), nullable=True),
        sa.Column('weight', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['evaluation_id'], ['manager_evaluations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_evaluation_categories_evaluation_id'), 'evaluation_categories', ['evaluation_id'], unique=False)
    op.create_index(op.f('ix_evaluation_categories_id'), 'evaluation_categories', ['id'], unique=False)


def downgrade() -> None:
    # Drop evaluation_categories table
    op.drop_index(op.f('ix_evaluation_categories_id'), table_name='evaluation_categories')
    op.drop_index(op.f('ix_evaluation_categories_evaluation_id'), table_name='evaluation_categories')
    op.drop_table('evaluation_categories')

    # Drop manager_evaluations table
    op.drop_index(op.f('ix_manager_evaluations_status'), table_name='manager_evaluations')
    op.drop_index(op.f('ix_manager_evaluations_manager_id'), table_name='manager_evaluations')
    op.drop_index(op.f('ix_manager_evaluations_id'), table_name='manager_evaluations')
    op.drop_index(op.f('ix_manager_evaluations_created_at'), table_name='manager_evaluations')
    op.drop_index(op.f('ix_manager_evaluations_branch_id'), table_name='manager_evaluations')
    op.drop_table('manager_evaluations')

    # Drop enums
    op.execute("DROP TYPE IF EXISTS evaluationstatus")
    op.execute("DROP TYPE IF EXISTS performancelevel")