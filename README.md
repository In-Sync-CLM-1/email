# Email Broadcast Platform

A multi-tenant email broadcast platform for sending campaigns via Resend API.

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (Auth, Database, Edge Functions, Storage)
- **Email**: Resend API
- **Hosting**: Azure Static Web Apps
- **CI/CD**: GitHub Actions

## Getting Started

```sh
# Clone the repository
git clone https://github.com/insyncclm133-ops/email.git
cd email

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your Supabase project credentials

# Start development server
npm run dev
```

## Environment Variables

See `.env.example` for required frontend variables. Edge function secrets are configured in Supabase dashboard.

## Deployment

Pushes to `main` automatically trigger deployment via GitHub Actions:
- Supabase migrations are pushed and edge functions deployed
- Frontend builds and deploys to Azure Static Web Apps
