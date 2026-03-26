# 📋 OJT DTR System

A full-stack **Daily Time Record (DTR)** and attendance tracking system built for OJT (On-the-Job Training) interns. It provides real-time time logging, accomplishment reporting, DTR document generation, and an admin dashboard — all accessible via a mobile-friendly web interface.

🌐 **Live:** [ojtdtr.systemproj.com](https://ojtdtr.systemproj.com)

---

## ✨ Features

### 👤 Intern Portal
- **Dashboard** — Overview of today's attendance status, total hours rendered, and quick actions
- **Time Logging** — Clock in/out for AM and PM shifts with real-time timestamps
- **Accomplishment Reports** — Submit daily accomplishments with photo documentation and notes
- **Attendance History** — View and edit past attendance records with AM/PM breakdown
- **Leaderboards** — Rankings of interns by total OJT hours rendered
- **DTR Export** — Generate and download DTR documents (Civil Service Form 48) as PDF, with selectable date ranges (1st–15th or 16th–end of month)
- **Settings** — Account management and password changes

### 🔐 Security
- JWT-based authentication with session tokens
- Single active session enforcement (auto-logout on multi-device login)
- 15-minute inactivity timeout with auto-logout
- Password reset via forgot-password flow

### 🛡️ Admin Panel
- Admin login and dashboard (`/admin`)
- Manage intern records and attendance data

### 📱 Mobile-First Design
- Fully responsive bottom navigation bar
- Touch-optimized UI with skeleton loading states
- Guided app tour for first-time users (React Joyride)

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| [React Router v7](https://reactrouter.com/) | Framework (SSR + file-based routing) |
| [React 19](https://react.dev/) | UI library |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [Tailwind CSS v4](https://tailwindcss.com/) | Styling |
| [Vite](https://vite.dev/) | Build tool |
| [Lucide React](https://lucide.dev/) | Icons |
| [React Joyride](https://react-joyride.com/) | Guided app tour |
| [React Tooltip](https://react-tooltip.com/) | Tooltips |

### Backend
| Technology | Purpose |
|---|---|
| [Django 5.2](https://www.djangoproject.com/) | Web framework |
| [Django REST Framework](https://www.django-rest-framework.org/) | REST API |
| [SimpleJWT](https://django-rest-framework-simplejwt.readthedocs.io/) | JWT authentication |
| [PostgreSQL](https://www.postgresql.org/) | Production database |
| [ReportLab](https://www.reportlab.com/) | PDF generation |
| [Gunicorn](https://gunicorn.org/) | WSGI HTTP server |
| [WhiteNoise](https://whitenoise.readthedocs.io/) | Static file serving |

### Deployment
| Service | Purpose |
|---|---|
| [Render](https://render.com/) | Hosting (frontend + backend + database) |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** ≥ 22.12.0
- **Python** ≥ 3.11
- **npm** ≥ 10

### 1. Clone the repository
```bash
git clone https://github.com/Emiruuu-404/dtr-system.git
cd dtr-system
```

### 2. Backend Setup
```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your settings

# Run migrations
python manage.py migrate

# Create a superuser (optional)
python manage.py createsuperuser

# Start the server
python manage.py runserver
```

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env — point VITE_API_URL to your backend (default: http://127.0.0.1:8000)

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173` and the backend API at `http://127.0.0.1:8000`.

---

## 📁 Project Structure

```
dtr-system/
├── frontend/                   # React Router v7 app
│   ├── app/
│   │   ├── components/         # Reusable components (Navbar, AppTour, etc.)
│   │   ├── routes/             # Page routes
│   │   │   ├── dashboard.tsx       # Home / Dashboard
│   │   │   ├── timein.tsx          # Accomplishment & time logging
│   │   │   ├── leaderboards.tsx    # Hour rankings
│   │   │   ├── history.tsx         # Attendance history
│   │   │   ├── reports.tsx         # DTR export / download
│   │   │   ├── settings.tsx        # Account settings
│   │   │   ├── login.tsx           # Login page
│   │   │   ├── register.tsx        # Registration page
│   │   │   ├── forgot-password.tsx # Password reset
│   │   │   ├── admin-dashboard.tsx # Admin panel
│   │   │   └── admin-login.tsx     # Admin login
│   │   ├── root.tsx            # App shell, auth guard, session management
│   │   ├── routes.ts           # Route configuration
│   │   └── config.ts           # API URL config
│   ├── public/                 # Static assets
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                    # Django REST API
│   ├── attendance/             # Main app
│   │   ├── models.py               # Intern, Attendance, Reports, History
│   │   ├── views.py                # API endpoints
│   │   ├── serializers.py          # DRF serializers
│   │   ├── pdf_generator.py        # DTR PDF generation
│   │   └── migrations/
│   ├── ojt_backend/            # Django project settings
│   ├── template/               # DTR PDF template files
│   ├── requirements.txt
│   ├── manage.py
│   └── Procfile
│
└── render.yaml                 # Render deployment config
```

---

## 🌐 Environment Variables

### Backend (`backend/.env`)
| Variable | Description | Default |
|---|---|---|
| `DEBUG` | Enable debug mode | `True` |
| `SECRET_KEY` | Django secret key | — |
| `ALLOWED_HOSTS` | Allowed hostnames | `*` |
| `CORS_ALLOW_ALL_ORIGINS` | Allow all CORS origins | `True` |
| `CORS_ALLOWED_ORIGINS` | Whitelisted frontend URLs | `http://localhost:5173` |
| `DATABASE_URL` | PostgreSQL connection string (production) | — |

### Frontend (`frontend/.env`)
| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Backend API URL | `http://127.0.0.1:8000` |

---

## 🚢 Deployment

The project is configured for deployment on **Render** using `render.yaml`:

- **Backend** — Python web service with Gunicorn
- **Frontend** — Node.js web service with React Router SSR
- **Database** — Managed PostgreSQL instance

Auto-deploy is enabled for both services on push to `main`.

---

## 📄 License

This project is for educational purposes as part of an OJT/internship program.
