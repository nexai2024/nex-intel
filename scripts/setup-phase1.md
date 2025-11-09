# IntelBox Phase 1 Setup Guide

This guide will help you set up IntelBox Phase 1 features including authentication, credit system, PDF export, Notion integration, dashboard, and error handling.

## Prerequisites

- Node.js 18+
- PostgreSQL database
- Supabase account (recommended for authentication)
- Tavily or SerpAPI API key for search functionality

## Setup Steps

### 1. Environment Configuration

1. Copy the example environment file:
```bash
cp .env.example .env.local
```

2. Fill in your environment variables:
```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/intelbox"

# Supabase Authentication
NEXT_PUBLIC_SUPABASE_URL="your-supabase-project-url.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"

# Search Provider (choose one)
TAVILY_API_KEY="your-tavily-api-key"
# OR
SERPAPI_API_KEY="your-serpapi-api-key"

# Optional: Notion Integration
NOTION_TOKEN="secret_your-notion-token"
NOTION_PARENT_PAGE_ID="your-notion-page-id"
```

### 2. Database Setup

1. Install dependencies:
```bash
npm install
```

2. Run database migrations:
```bash
npx prisma migrate dev
```

3. Generate Prisma client:
```bash
npx prisma generate
```

### 3. Supabase Setup

1. Create a new Supabase project at https://supabase.com
2. Get your project URL and anon key from Settings > API
3. Configure authentication providers in Supabase Dashboard:
   - Enable Email/Password authentication
   - Set up redirect URL: `http://localhost:3000/auth/callback`
4. Copy the credentials to your `.env.local` file

### 4. Search Provider Setup

#### Option A: Tavily (Recommended)
1. Sign up at https://tavily.com
2. Get your API key from the dashboard
3. Add `TAVILY_API_KEY` to your environment variables

#### Option B: SerpAPI
1. Sign up at https://serpapi.com
2. Get your API key from the dashboard
3. Add `SERPAPI_API_KEY` to your environment variables

### 5. Optional: Notion Integration

1. Create a Notion integration at https://www.notion.so/my-integrations
2. Get your integration token
3. Create a page in Notion to be the parent for reports
4. Get the page ID (from the URL)
5. Add both values to your environment variables

### 6. Start the Application

```bash
npm run dev
```

Visit http://localhost:3000 to access IntelBox.

## Phase 1 Features

### ✅ Completed Features

1. **Authentication System**
   - User registration and login
   - Session management with Supabase
   - Protected routes and API endpoints
   - User profile synchronization

2. **Credit System**
   - Monthly credit tracking (1000 credits/month)
   - Credit consumption on runs
   - Credit usage dashboard
   - Rate limiting enforcement

3. **PDF Export**
   - Professional PDF generation with Puppeteer
   - Serverless-compatible configuration
   - Enhanced styling and formatting
   - Proper error handling

4. **Notion Integration**
   - Export reports to Notion pages
   - Improved error handling and validation
   - Configuration validation
   - User permission checks

5. **Analytics Dashboard**
   - Project and run statistics
   - Credit usage visualization
   - Recent activity tracking
   - Top projects overview

6. **Error Handling**
   - Custom error classes
   - Structured error logging
   - Consistent API error responses
   - Better user feedback

## Testing the Features

### Authentication Test
1. Navigate to http://localhost:3000
2. Click "Sign In"
3. Create a new account
4. Verify you can access protected pages

### Credit System Test
1. Sign in and check the credit widget in the sidebar
2. Start a run and verify credits are consumed
3. Check the dashboard for credit usage stats

### PDF Export Test
1. Complete a run successfully
2. Click "Export PDF" on the run page
3. Verify the PDF downloads properly

### Notion Integration Test
1. Configure Notion credentials
2. Click "Export to Notion" on a completed run
3. Check your Notion workspace for the new page

### Dashboard Test
1. Navigate to the Dashboard page
2. Verify statistics display correctly
3. Check recent activity and top projects

## Troubleshooting

### Common Issues

1. **"User not authenticated" errors**
   - Check your Supabase configuration
   - Verify environment variables are set correctly
   - Ensure redirect URLs match in Supabase settings

2. **Database connection errors**
   - Verify your DATABASE_URL is correct
   - Check if PostgreSQL is running
   - Run migrations with `npx prisma migrate dev`

3. **Search provider errors**
   - Verify your API key is valid
   - Check if you have credits available
   - Try the other search provider

4. **PDF export failures**
   - Ensure Puppeteer dependencies are installed
   - Check server logs for specific error messages
   - Try with smaller reports first

5. **Notion export errors**
   - Verify your Notion token has proper permissions
   - Check if the parent page ID is correct
   - Ensure the Notion integration is enabled

## Next Steps

After completing Phase 1 setup, you can:

1. Create test projects and runs
2. Invite team members to test the system
3. Configure search providers
4. Set up Notion integration
5. Begin user testing and feedback collection

## Support

For issues with Phase 1 features:
1. Check the console logs for error details
2. Verify all environment variables are set
3. Ensure all migrations have been applied
4. Check that all dependencies are installed

Phase 2 will add real-time monitoring, enhanced reporting, and user experience improvements.