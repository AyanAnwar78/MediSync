# MediSync — Smart Hospital Doctor Availability & Appointment Allocation System

Academic Software Engineering Project: **"Optimizing Doctor Availability and Appointment Allocation in Hospitals Through Digital Technology and AI Integration."**

## Technology Stack

- **Backend:** C#, ASP.NET Core Web API (`.NET 10.0`), Entity Framework Core `10.0`, JWT Bearer Authentication + PBKDF2 (`IPasswordHasher<User>`), LINQ, Swashbuckle Swagger (`10.*`)
- **Frontend:** React `19`, Vite `6`, JavaScript (`.jsx`), Tailwind CSS v4 (`@tailwindcss/vite`), Axios `1.7`, React Router `7`, `lucide-react`
- **Database:** Microsoft SQL Server / LocalDB (`(localdb)\MSSQLLocalDB`, database `MediSyncDb`)
- **Smart Scheduling Engine:** Deterministic rule-based multi-criteria weighted scoring engine (`ScoringWeights` + `SmartSchedulingService`, explicitly non-ML)

## Project Structure

```text
MediSync/
├── backend/
│   ├── MediSync.slnx
│   ├── MediSync.Api/
│   │   ├── Authentication/        # JwtSettings, JwtTokenGenerator, CurrentUserService
│   │   ├── Controllers/           # Auth, Departments, Doctors, Patients, Schedules, Leaves, Appointments, Recommendations, Analytics, Health
│   │   ├── Data/
│   │   │   ├── Configurations/    # Fluent API constraints & filtered unique indexes
│   │   │   ├── Migrations/        # EF Core SQL Server migrations (20261111150721_InitialCreate)
│   │   │   ├── DbSeeder.cs        # Idempotent academic seed dataset
│   │   │   └── MediSyncDbContext.cs
│   │   ├── DTOs/                  # Request/Response contracts grouped by module
│   │   ├── Interfaces/            # Service abstractions registered via DI
│   │   ├── Middleware/            # GlobalExceptionMiddleware (RFC 7807 ProblemDetails)
│   │   ├── Models/                # 7 entities + Enums (UserRole, AppointmentStatus, LeaveStatus)
│   │   ├── Scheduling/            # ScoringWeights, SlotGenerator, SmartSchedulingService
│   │   ├── Services/              # Auth, Department, Doctor, Patient, Schedule, Leave, Appointment, Analytics
│   │   └── Program.cs             # DI, JWT Bearer, CORS, Swagger, auto MigrateAsync + SeedAsync
│   └── MediSync.Tests/            # xUnit verification suite (19 tests)
├── database/
│   └── schema.sql                 # Idempotent SQL Server DDL generated from EF Core migrations
└── frontend/
    ├── .env.example               # VITE_API_BASE_URL=http://localhost:5054/api
    ├── package.json
    └── src/
        ├── api/                   # axiosClient + 9 endpoint clients
        ├── components/            # Layout, common UI primitives, AppointmentCalendar, SlotPicker, RecommendationCard
        ├── context/               # AuthContext
        ├── pages/                 # 17 pages across Auth, Admin, Doctor, and Patient portals
        ├── routes/                # ProtectedRoute & RoleRedirect
        └── utils/                 # Shared date/time/currency/error formatters
```

## Prerequisites

- **.NET SDK 10.0+**
- **Node.js 20+** and **npm**
- **SQL Server LocalDB** (or SQL Server Express/Developer — update `ConnectionStrings:DefaultConnection` in `backend/MediSync.Api/appsettings.Development.json` if not using `(localdb)\MSSQLLocalDB`)

## Local Setup & Run Instructions

### 1. Start & Initialize the Database (SQL Server)

`MediSync.Api` automatically runs `Database.MigrateAsync()` and `DbSeeder.SeedAsync(...)` on startup when `MediSyncDb` is created or empty.

If you prefer creating the schema manually beforehand:

```powershell
sqlcmd -S "(localdb)\MSSQLLocalDB" -Q "CREATE DATABASE MediSyncDb;"
sqlcmd -S "(localdb)\MSSQLLocalDB" -d MediSyncDb -E -i database\schema.sql
```

Or via EF Core CLI:

```powershell
dotnet ef database update --project backend/MediSync.Api
```

### 2. Run the ASP.NET Core Backend API

```powershell
cd backend/MediSync.Api
dotnet restore
dotnet run
```

- API Base URL: `http://localhost:5054`
- Swagger UI (Development): `http://localhost:5054/swagger`
- Health Check: `http://localhost:5054/api/health`

### 3. Configure & Run the React Frontend

```powershell
cd frontend
Copy-Item .env.example .env -Force
npm install
npm run dev
```

- Frontend URL: `http://localhost:5173`
- Environment variable in `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5054/api
```

## Demo Seed Accounts

| Role | Name | Email | Password |
|---|---|---|---|
| **Admin** | Dr. Eleanor Vance | `admin@medisync.local` | `Admin@123` |
| **Doctor** (Cardiology) | Dr. Rajesh Sharma | `sharma@medisync.local` | `Doctor@123` |
| **Doctor** (Cardiology) | Dr. Meera Patel | `patel@medisync.local` | `Doctor@123` |
| **Doctor** (Neurology) | Dr. David Chen | `chen@medisync.local` | `Doctor@123` |
| **Doctor** (Orthopedics) | Dr. Amara Okafor | `okafor@medisync.local` | `Doctor@123` |
| **Doctor** (Pediatrics) | Dr. Sofia Garcia | `garcia@medisync.local` | `Doctor@123` |
| **Doctor** (General Medicine) | Dr. Lucas Miller | `miller@medisync.local` | `Doctor@123` |
| **Patient** | Aarav Mehta | `patient1@medisync.local` | `Patient@123` |
| **Patient** | Hannah Brooks | `patient2@medisync.local` | `Patient@123` |
| **Patient** | Liam Carter | `patient3@medisync.local` | `Patient@123` |

## Testing Commands

### Backend Automated Unit & Rule Tests (`xUnit`, 19 tests)

```powershell
dotnet test backend/MediSync.Tests/MediSync.Tests.csproj --verbosity normal
```

### Full Solution Build

```powershell
dotnet build backend/MediSync.slnx
```

### Frontend Production Build

```powershell
npm run build --prefix frontend
```
