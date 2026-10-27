@echo off
set DATABASE_URL=postgresql://configura3d:configura3d@localhost:5433/configura3d?schema=public
set PORT=3333
set NODE_ENV=development
set JWT_SECRET=dev-secret-change-me-in-production
set CORS_ORIGINS=http://localhost:5173
set LOG_LEVEL=warn
node dist/index.js
