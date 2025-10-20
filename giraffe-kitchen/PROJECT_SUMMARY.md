# Giraffe Kitchens - Food Quality Management System

## Project Overview

Giraffe Kitchens is a comprehensive food quality management system designed for restaurant chains to monitor and maintain food quality across multiple branches. The system enables quality checks, daily task management, and analytics reporting with role-based access control.

## Technology Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: SQLite (development) with SQLAlchemy ORM
- **Authentication**: JWT (JSON Web Tokens)
- **API Documentation**: Swagger UI / ReDoc
- **Migrations**: Alembic

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **Styling**: TailwindCSS
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Language**: Hebrew (RTL support)

## System Features

### 1. Authentication & Authorization
- JWT-based authentication
- Three user roles:
  - **HQ**: Full system access, can manage dishes, chefs, branches, and tasks
  - **BRANCH_MANAGER**: Branch-level access for quality checks and task completion
  - **CHEF**: Read-only access for viewing quality data
- Secure password hashing with bcrypt

### 2. Quality Checks (Dish Checks)
- Record quality ratings for dishes (1-5 scale)
- Support for both:
  - Pre-defined dishes from database
  - Manual dish entry (for new items)
- Support for both:
  - Pre-defined chefs from database
  - Manual chef name entry
- Add comments and notes
- Date-stamped records
- Branch-specific tracking

### 3. Daily Tasks Management
- Two task types:
  - **DISH_CHECK**: Physical inspection of specific dishes
  - **RECIPE_REVIEW**: Recipe review and knowledge refresh
- Task frequency options:
  - Once (one-time task)
  - Daily (recurring daily)
  - Weekly (recurring weekly)
- Assign tasks to:
  - All branches
  - Specific branches
- Track task completion by branch
- Task completion tracking with timestamps

### 4. Analytics & Reports
- Dashboard with key metrics:
  - Weakest performing dish
  - Recent quality checks
  - Branch performance overview
- Filter by:
  - Date range (week/month/all-time)
  - Branch
  - Dish
- Trend analysis
- Completion rate tracking

### 5. Master Data Management (HQ Only)
- **Dishes**: Name, category
- **Chefs**: Name, branch assignment
- **Branches**: Name, location
- **Users**: Email, role, branch assignment

## Database Schema

### Core Models

#### Users
- id, email, password_hash, full_name
- role (HQ, BRANCH_MANAGER, CHEF)
- branch_id (nullable for HQ users)

#### Branches
- id, name, location

#### Dishes
- id, name, category

#### Chefs
- id, name, branch_id

#### DishChecks
- id, branch_id, dish_id (nullable), dish_name_manual (nullable)
- chef_id (nullable), chef_name_manual (nullable)
- rating (1-5), comments, check_date
- created_by, created_at

#### DailyTasks
- id, title, description
- task_type (DISH_CHECK, RECIPE_REVIEW)
- dish_id (nullable)
- frequency (ONCE, DAILY, WEEKLY)
- start_date, end_date, is_active
- created_by_user_id

#### TaskAssignments
- id, task_id, branch_id, task_date
- is_completed, completed_at, completed_by_user_id
- notes, check_id

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login (returns JWT)

### Branches
- `GET /api/v1/branches/` - List all branches
- `POST /api/v1/branches/` - Create branch (HQ only)

### Dishes
- `GET /api/v1/dishes/` - List all dishes
- `POST /api/v1/dishes/` - Create dish (HQ only)

### Chefs
- `GET /api/v1/chefs/` - List chefs (optionally filter by branch)
- `POST /api/v1/chefs/` - Create chef (HQ only)

### Checks (Dish Quality)
- `GET /api/v1/checks/` - List checks (with filters)
- `POST /api/v1/checks/` - Create quality check
- `GET /api/v1/checks/analytics` - Get analytics data
- `GET /api/v1/checks/weakest-dish` - Get weakest performing dish

### Daily Tasks
- `GET /api/v1/tasks/` - List all tasks (HQ only)
- `POST /api/v1/tasks/` - Create task (HQ only)
- `GET /api/v1/tasks/assignments` - List all assignments (HQ only)
- `GET /api/v1/tasks/my-tasks` - Get branch tasks (Branch Manager)
- `POST /api/v1/tasks/assignments/{id}/complete` - Mark task complete
- `DELETE /api/v1/tasks/assignments/{id}/complete` - Unmark task

## Frontend Pages

### Public
- **Login** (`/`) - Authentication page with demo credentials

### Protected (Authenticated)
- **Dashboard** (`/dashboard`) - Main overview with metrics
- **New Check** (`/new-check`) - Record quality check
- **Tasks** (`/tasks`) - Task management (HQ only)
  - Create Task tab
  - Manage Tasks tab
  - Track Completion tab
- **Reports** (`/reports`) - Analytics and reporting

## Project Structure

```
giraffe-kitchen/
├── giraffe-backend/
│   ├── alembic/              # Database migrations
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py       # Dependencies (auth, db)
│   │   │   └── v1/           # API endpoints
│   │   │       ├── auth.py
│   │   │       ├── branches.py
│   │   │       ├── chefs.py
│   │   │       ├── checks.py
│   │   │       ├── daily_tasks.py
│   │   │       └── dishes.py
│   │   ├── core/
│   │   │   ├── config.py     # Settings & environment
│   │   │   └── security.py   # JWT & password hashing
│   │   ├── db/
│   │   │   └── base.py       # Database session
│   │   ├── models/           # SQLAlchemy models
│   │   │   ├── branch.py
│   │   │   ├── chef.py
│   │   │   ├── daily_task.py
│   │   │   ├── dish.py
│   │   │   ├── dish_check.py
│   │   │   └── user.py
│   │   ├── schemas/          # Pydantic schemas
│   │   │   ├── branch.py
│   │   │   ├── chef.py
│   │   │   ├── dish.py
│   │   │   ├── dish_check.py
│   │   │   └── user.py
│   │   └── main.py           # FastAPI app
│   ├── seed_data.py          # Initial data seeding
│   ├── requirements.txt
│   └── README.md
│
└── giraffe-frontend/
    ├── src/
    │   ├── components/
    │   │   └── ProtectedRoute.tsx
    │   ├── contexts/
    │   │   └── AuthContext.tsx    # Auth state management
    │   ├── pages/
    │   │   ├── Login.tsx
    │   │   ├── Dashboard.tsx
    │   │   ├── NewCheck.tsx
    │   │   ├── Tasks.tsx
    │   │   └── Reports.tsx
    │   ├── services/
    │   │   └── api.ts              # Axios API client
    │   ├── types/
    │   │   └── index.ts            # TypeScript types
    │   ├── App.tsx
    │   ├── main.tsx
    │   └── index.css               # TailwindCSS
    ├── package.json
    └── vite.config.ts
```

## Setup Instructions

### Backend Setup

1. **Create virtual environment**
   ```bash
   cd giraffe-kitchen/giraffe-backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Setup environment**
   ```bash
   cp .env.example .env
   # Edit .env if needed
   ```

4. **Run migrations**
   ```bash
   alembic upgrade head
   ```

5. **Seed initial data**
   ```bash
   python seed_data.py
   ```

6. **Start server**
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

### Frontend Setup

1. **Install dependencies**
   ```bash
   cd giraffe-kitchen/giraffe-frontend
   npm install
   ```

2. **Start development server**
   ```bash
   npm run dev
   ```

3. **Access application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## Demo Credentials

### HQ User
- Email: `giraffe@giraffe.com`
- Password: `giraffe123`

### Branch Manager (Tel Aviv)
- Email: `tlv@giraffe.com`
- Password: `giraffe123`

### Chef (Tel Aviv)
- Email: `chef1@giraffe.com`
- Password: `giraffe123`

## Key Features & Functionality

### Manual Entry Support
The system supports both pre-defined and manual entry for:
- **Dishes**: Select from database or enter manually
- **Chefs**: Select from database or enter manually

This flexibility allows for:
- Testing new dishes before adding to master data
- Recording checks for temporary staff
- Quick data entry without pre-configuration

### Role-Based Access Control
- **HQ Users**: Full access to all features including task creation and master data management
- **Branch Managers**: Can perform quality checks and complete assigned tasks
- **Chefs**: Read-only access to view quality data

### Task Assignment System
- HQ creates tasks with specific requirements
- Tasks automatically assigned to selected branches
- Branch managers see daily task list
- Completion tracking with timestamps and notes
- Can link completed tasks to specific quality checks

### Analytics
- Real-time dashboard metrics
- Trend analysis over time
- Branch performance comparison
- Dish quality tracking
- Weakest dish identification for improvement focus

## Recent Updates & Fixes

### Backend
- Fixed task API endpoint (`/api/v1/tasks/`) validation errors
- Updated `TaskResponse` schema to make `dish_name` optional
- Corrected imports in `daily_tasks.py` for consistency
- Added proper CORS configuration for development

### Frontend
- Added `Array.isArray()` safety checks for data rendering
- Fixed branch selector location (moved into NewCheck page)
- Updated API calls to include trailing slashes
- Added proper JWT token handling in AuthContext
- Improved error handling and loading states

## Development Notes

### CORS Configuration
Backend allows all origins in development mode (`DEBUG=true`). In production, configure `ALLOWED_ORIGINS` in environment variables.

### Database
Currently using SQLite for development. For production, update `DATABASE_URL` to PostgreSQL or MySQL.

### Authentication
JWT tokens expire after 30 days (configurable in `core/config.py`). Tokens include user ID, email, full name, role, and branch ID.

## Future Enhancements

- [ ] Multi-language support (currently Hebrew only)
- [ ] Export reports to PDF/Excel
- [ ] Photo upload for quality checks
- [ ] Push notifications for task assignments
- [ ] Advanced analytics with charts
- [ ] Recipe management module
- [ ] Inventory integration
- [ ] Mobile app (React Native)

## Support & Documentation

- Backend API Documentation: http://localhost:8000/docs
- Frontend runs on: http://localhost:5173
- All API endpoints follow RESTful conventions
- Hebrew interface with full RTL support

## License

Proprietary - Giraffe Kitchens Ltd.

---

**Last Updated**: October 2025
**Version**: 1.0.0
**Status**: Production Ready
