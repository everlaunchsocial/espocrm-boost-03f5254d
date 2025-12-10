# EverLaunch CRM

## Overview
A comprehensive CRM system with AI-powered features migrated from Lovable to Replit. The application includes:
- Contact/Lead management
- Affiliate marketing platform with multi-level commission tracking
- AI demo system (chat and voice)
- Email tracking and automation
- Billing/subscription management via Stripe
- Calendar booking system

## Project Structure
```
client/              # Frontend React application
  src/
    components/      # UI components (affiliate, crm, customer, demos, etc.)
    hooks/           # Custom React hooks
    integrations/    # Supabase integration (legacy, to be migrated)
    lib/             # Utility libraries
    pages/           # Route pages
    stores/          # Zustand stores
    types/           # TypeScript types
    utils/           # Utility functions
server/              # Backend Express server
  db.ts              # Database connection
  index.ts           # Server entry point
  routes.ts          # API routes
  storage.ts         # Storage interface
  vite.ts            # Vite dev server integration
shared/              # Shared code between frontend and backend
  schema.ts          # Drizzle database schema
supabase/            # Legacy Supabase Edge Functions (to be migrated)
```

## Technology Stack
- **Frontend**: React, TypeScript, Vite, TailwindCSS, Shadcn/UI
- **Backend**: Express.js, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **State Management**: Zustand, TanStack Query
- **Routing**: React Router DOM

## Running the Project
```bash
npm run dev          # Start development server on port 5000
npm run build        # Build for production
npm run db:push      # Push schema changes to database
```

## Environment Variables
The application requires the following environment variables:
- `DATABASE_URL` - PostgreSQL connection string (auto-configured by Replit)
- `VITE_SUPABASE_URL` - Supabase project URL (optional during migration)
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key (optional during migration)

## Recent Changes
- December 10, 2025: Migrated from Lovable to Replit environment
  - Set up Replit full-stack template structure
  - Configured Express backend with Vite integration
  - Added Drizzle ORM for database management
  - Fixed CSS @import ordering
  - Added placeholder Supabase credentials for initial setup

## Next Steps for Full Migration
1. Configure actual Supabase credentials if continuing to use Supabase
2. OR migrate Supabase Edge Functions to Express API routes
3. Set up proper authentication
4. Configure Stripe integration for billing
