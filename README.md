# Stackvil Online Examination Portal

A complete, production-ready Online Examination Portal with premium UI/UX, dynamic Monaco code editors, and multi-layered proctoring/anti-cheating triggers.

---

## 🚀 Tech Stack

### Frontend
- **Framework:** React.js (Vite configuration)
- **Navigation:** React Router DOM v6
- **Styling:** Tailwind CSS v3
- **Auditing Charts:** Chart.js & React Chartjs 2
- **Dynamic Animations:** Framer Motion
- **Form Controls:** React Hook Form
- **Code Editor:** Monaco Editor (`@monaco-editor/react`)
- **API Client:** Axios

### Backend
- **Server Environment:** Node.js
- **Web Framework:** Express.js (REST APIs)
- **Database driver:** MongoDB (Mongoose ORM)
- **Security:** Helmet headers, CORS, Express Rate Limiter, bcryptjs password hashing, JWT session authentication
- **Upload handler:** Multer (Snapshots, logo assets, excels)
- **Docs generator:** Swagger Specification UI

---

## 🔒 Proctoring & Anti-Cheating Suite

This application implements strict security rules to preserve the integrity of assessments:
1. **Camera & Mic Authorization:** Checked on Instructions load; blocks access if disabled.
2. **Mandatory Fullscreen:** Locks screen layout on Exam Room start. Exiting fullscreen fires alert modals and logs a warning.
3. **Tab Focus Tracker:** Detects document visibility shifts. Tab switching logs warning counts and captures visual screenshots.
4. **Locks Keyboard Shortcuts:** Restricts `F12`, developer console keys (`Ctrl+Shift+I/J/C`), view source (`Ctrl+U`), Print Screen, save commands.
5. **Disabled Copy/Paste/Highlight:** Context menus, selection, cutting, copying, and pasting are disabled.
6. **Autosave during Outages:** Detects network status drops, automatically stores responses in local storage, and syncs back when online.
7. **Warning limit Submission:** Maximum of 5 warnings are allowed. Reaching the threshold submits the exam automatically.

---

## 📂 Project Structure

```
stackvil-exam/
├── backend/                  # Node/Express API Server
│   ├── config/               # Database, Mailer, & Swagger setups
│   ├── controllers/          # Business logic (REST controllers)
│   ├── middleware/           # JWT verification, upload filters, rate limiters
│   ├── models/               # Mongoose MongoDB schemas
│   ├── routes/               # REST API paths matching controllers
│   ├── utils/                # PDF result generators and Excel converters
│   ├── .env.example
│   ├── seed.js               # Database seeding operations
│   ├── server.js             # Main server execution point
│   └── package.json
│
└── frontend/                 # Vite/React Client Application
    ├── src/
    │   ├── assets/
    │   ├── components/       # Layouts, Monaco wrappers, camera modules
    │   ├── context/          # Auth context and theme controllers
    │   ├── pages/            # Login, Admin dashboards, Student rooms
    │   ├── App.jsx           # Routing paths
    │   ├── index.css         # Stylesheets & animations
    │   └── main.jsx          # React renderer
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── vite.config.js
    └── package.json
```

---

## 🛠️ Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended)
- [MongoDB](https://www.mongodb.com/) running locally or an active Atlas connection string.

### 1. Database & Backend Configuration
1. Navigate into the backend folder:
   ```bash
   cd stackvil-exam/backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create your `.env` configuration:
   ```bash
   cp .env.example .env
   ```
   Modify `MONGO_URI` or SMTP settings in `.env` if needed.
4. Pre-populate default settings, questions, exams, and candidate profiles:
   ```bash
   npm run seed
   ```
   *Note: This generates default credentials (listed below) and schedules an active exam.*
5. Start the API server:
   ```bash
   npm run dev
   ```
   The backend runs on `http://localhost:5000`. The API document reference is available at `http://localhost:5000/api-docs`.

### 2. Frontend Configuration
1. Navigate to the frontend folder:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Spin up the development server:
   ```bash
   npm run dev
   ```
   The web client runs on `http://localhost:5173`.

---

## 🔑 Demo Access Profiles

After running the database seeding script (`npm run seed`), use the credentials below to log in:

### 1. Super Admin Profile
- **Email:** `admin@stackvil.com`
- **Password:** `password123`

### 2. HR Admin Profile
- **Email:** `hr@stackvil.com`
- **Password:** `password123`

### 3. Candidate Profile
- **Email:** `candidate@stackvil.com`
- **Password:** `password123`
