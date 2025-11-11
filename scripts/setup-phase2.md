# CompeteIQ Phase 2 Setup Guide

This guide will help you set up CompeteIQ Phase 2 features including real-time monitoring, email notifications, enhanced reporting, and improved user onboarding.

## Prerequisites

- Completed Phase 1 setup (authentication, database, search providers)
- Node.js 18+
- Email service account (Resend, SendGrid, or AWS SES)

## Phase 2 New Features

### ✅ Real-time Monitoring & Change Detection
- **Scheduled automatic re-runs** (weekly analysis)
- **Source change detection** with content hashing
- **Smart alert system** for significant changes
- **Email notifications** for important updates
- **Monitoring dashboard** with project controls

### ✅ Enhanced User Experience
- **Interactive report viewer** with search and section controls
- **Onboarding flow** for new users (6-step guided tour)
- **Better email templates** with change alerts
- **Improved navigation** and user interface

## Setup Steps

### 1. Update Environment Variables

Add these new variables to your `.env.local` file:

```bash
# Email Notifications (required for Phase 2 features)
RESEND_API_KEY="your-resend-api-key"
FROM_EMAIL="noreply@yourdomain.com"

# Application URL (important for email links)
NEXT_PUBLIC_APP_URL="https://your-domain.com"  # Production URL
```

#### Email Service Setup

**Option A: Resend (Recommended)**
1. Sign up at https://resend.com
2. Get your API key from the dashboard
3. Verify your sending domain
4. Add `RESEND_API_KEY` and `FROM_EMAIL` to environment

**Option B: SendGrid**
1. Sign up at https://sendgrid.com
2. Create an API key
3. Verify your sender identity
4. Add `SENDGRID_API_KEY` and `FROM_EMAIL` to environment

**Option C: AWS SES**
1. Set up AWS SES in your AWS account
2. Verify identities (domains or email addresses)
3. Create IAM user with SES permissions
4. Add AWS credentials to environment

### 2. Database Migrations

Phase 2 uses the same database schema as Phase 1, but includes additional tables for change detection. Run migrations if needed:

```bash
npx prisma migrate deploy
```

### 3. Start the Scheduler (Important!)

The real-time monitoring system requires the task scheduler to be running. The scheduler is automatically started when the application loads.

```bash
npm run dev
```

The scheduler will:
- Check for scheduled tasks every 30 seconds
- Run automatic re-runs for monitored projects
- Process change detection and alerts
- Send email notifications

### 4. Test Phase 2 Features

#### A. Test Real-time Monitoring
1. Navigate to a project page
2. Click "Enable Monitoring" in the monitoring card
3. Verify you receive a confirmation email
4. Check that scheduled tasks appear in the monitoring dashboard

#### B. Test Change Detection
1. Complete a run for a project
2. Manually run the same project again
3. Check the new report for "Change Detection" findings
4. Verify alerts appear in the run logs

#### C. Test Email Notifications
1. Complete a new analysis run
2. Check your email for the completion notification
3. Enable monitoring on a project
4. Check for the monitoring setup confirmation email

#### D. Test Interactive Report Viewer
1. Open a completed report
2. Switch to "Interactive" view mode
3. Try the search functionality
4. Expand/collapse sections
5. Test the copy to clipboard feature

#### E. Test Onboarding Flow
1. Clear the onboarding completion flag:
   ```javascript
   localStorage.removeItem('CompeteIQ-onboarding-completed');
   ```
2. Refresh the page
3. Go through the 6-step onboarding process
4. Verify completion tracking and navigation

## Phase 2 Architecture Overview

### Monitoring System
- **Task Scheduler**: Central task queue system
- **Change Detection**: Content hashing and comparison
- **Alert Engine**: Severity-based alert generation
- **Email Service**: Template-based notifications

### Email Templates
- **Report Completion**: Basic completion notification
- **Change Alerts**: Highlight important competitive changes
- **Monitoring Setup**: Confirmation when enabling monitoring
- **Welcome Series**: Part of onboarding flow

### Interactive Features
- **Search**: Full-text search within reports
- **Section Controls**: Expand/collapse individual sections
- **Copy to Clipboard**: Quick content sharing
- **Multiple View Modes**: Standard vs Interactive viewers

## Troubleshooting

### Common Issues

1. **Email notifications not working**
   - Verify your email service API key
   - Check if your domain is verified
   - Look at browser console for errors
   - Check server logs for email failures

2. **Monitoring not running scheduled tasks**
   - Verify the application is running (not just built)
   - Check browser console for scheduler errors
   - Ensure cron jobs aren't interfering
   - Check system time and timezone settings

3. **Change detection not finding differences**
   - Verify sources have different content (not just timestamps)
   - Check if content hashing is working
   - Ensure previous runs completed successfully
   - Look for "Change detection completed" logs

4. **Onboarding not appearing**
   - Clear browser localStorage: `localStorage.removeItem('CompeteIQ-onboarding-completed')`
   - Check if user is properly authenticated
   - Verify the `/api/auth/me` endpoint works
   - Look for JavaScript errors in console

5. **Interactive viewer not loading**
   - Check if report data is properly formatted
   - Verify JavaScript is enabled
   - Look for console errors in the viewer component
   - Test with a fresh report

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=CompeteIQ:* npm run dev
```

This will show detailed logs for:
- Scheduler activity
- Change detection process
- Email sending attempts
- Onboarding state changes

## Performance Considerations

### Scheduler Load
- The scheduler processes up to 3 tasks concurrently
- Tasks are queued in memory (no persistence required)
- CPU usage is minimal during idle periods
- Monitoring scales with number of active projects

### Email Service Limits
- Resend: 3,000 emails/day on free tier
- SendGrid: 100 emails/day on free tier
- AWS SES: 62,000 emails/month (free tier)
- Consider daily digest emails for high-volume usage

### Database Performance
- Change detection uses content hashing (minimal overhead)
- Source snapshots are stored as text (300KB limit)
- Monitoring metadata adds minimal storage overhead
- Consider periodic cleanup of old run logs

## Next Steps

After Phase 2 setup:

1. **Configure Email Service**: Set up your preferred email provider
2. **Test Core Features**: Verify monitoring and notifications work
3. **User Testing**: Have team members try the onboarding flow
4. **Monitor Performance**: Keep an eye on scheduler and email usage
5. **Plan Phase 3**: Prepare for advanced features and scaling

Phase 3 will include:
- Industry-specific report templates
- Shareable report links with access controls
- Advanced analytics and historical trends
- Team collaboration features
- Content marketing and referral programs

## Support

For Phase 2 specific issues:
1. Check browser console and server logs
2. Verify all environment variables are set
3. Ensure Phase 1 features still work correctly
4. Test email delivery with your chosen service
5. Check scheduler status in browser dev tools

Phase 2 represents a significant step toward automated competitive intelligence monitoring! 🚀