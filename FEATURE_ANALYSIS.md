# CompeteIQ - Competitive Intelligence Platform
## Feature Analysis & Implementation Status

## App Description

**CompeteIQ** is an automated competitive intelligence platform that generates evidence-backed competitive analysis reports. The system:

1. **Discovers** relevant sources about competitors through web search (Tavily/SerpAPI)
2. **Extracts** structured data from sources (capabilities, pricing, integrations, compliance)
3. **Synthesizes** findings (gaps, differentiators, common features) with citations
4. **Generates** markdown reports tailored to industry verticals
5. **Enables** human review/approval workflow before finalizing reports
6. **Exports** to Notion and PDF formats

The platform is designed for product teams, GTM teams, and competitive intelligence professionals who need to quickly understand competitor landscapes with source citations for credibility.

---

## Feature Categories & Implementation Status

### 1. PROJECT MANAGEMENT

#### ✅ Fully Implemented
- **Create Projects** - Form with industry, sub-industry, target segments, regions, deployment, pricing model, sales motion, compliance needs
- **List Projects** - Table view with stats (run counts, last run status)
- **View Project Details** - Individual project page with runs list
- **Project Inputs** - Keywords, competitors, URLs stored per project
- **Project Metadata** - Industry classification, target segments, regions, deployment models

#### ⚠️ Partially Implemented
- **User Association** - Projects linked to users, but using hardcoded 'demo-user' (auth TODO)
- **Project Notes** - Schema has `notes` field but no UI for editing

#### ❌ Not Implemented / Errors
- **Project Editing** - No update/edit endpoint or UI
- **Project Deletion** - No delete functionality
- **Project Sharing** - No multi-user/workspace support
- **Project Templates** - No template system for common project types

---

### 2. RUN ORCHESTRATION & PROCESSING

#### ✅ Fully Implemented
- **Run Creation** - Create runs from projects
- **Orchestration Pipeline** - Multi-phase processing:
  - DISCOVERING: Web search for sources
  - EXTRACTING: Fetch & parse content
  - SYNTHESIZING: Generate findings & report
  - QA: Guardrails validation
  - COMPLETE: Final report ready
- **Status Polling** - Real-time status updates in UI
- **Run Logs** - Logging system for debugging
- **Error Handling** - Error status and logging
- **Rate Limiting** - Monthly run limits per user (moved to API route)

#### ⚠️ Partially Implemented
- **Job Queue System** - Infrastructure exists (`/api/jobs/enqueue`, `/api/jobs/worker`) but runs are called directly instead of queued
- **Bulk Operations** - Bulk start/rerun endpoints exist but may have issues
- **Run Cancellation** - Endpoint exists but may not properly stop in-progress orchestration
- **Run Rerun** - Endpoint exists but may create new run instead of reusing data

#### ❌ Not Implemented / Errors
- **Background Job Processing** - Jobs enqueued but worker needs cron/external trigger (per NOTES.md)
- **Run Scheduling** - No scheduled/recurring runs
- **Run Pausing/Resuming** - No pause/resume capability
- **Run Comparison** - No diff view between runs
- **Run Templates** - No saved run configurations

---

### 3. DISCOVERY & SEARCH

#### ✅ Fully Implemented
- **Search Provider Abstraction** - Interface for multiple providers
- **Tavily Integration** - Full implementation with API key support
- **SerpAPI Integration** - Full implementation with API key support
- **Query Building** - Dynamic query generation from project data
- **URL Deduplication** - Prevents duplicate sources
- **Source Persistence** - Stores discovered URLs with metadata

#### ⚠️ Partially Implemented
- **Fallback Search** - NullSearch returns empty (no fallback to default sources)
- **Search Configuration** - Settings page exists but may not be fully wired
- **Freshness Filtering** - Implemented but may not be fully utilized

#### ❌ Not Implemented / Errors
- **Curated Source Lists** - No manual source addition/curation
- **Source Quality Scoring** - No ranking/quality metrics
- **Search Result Preview** - No preview before adding to sources
- **Multi-language Support** - No international search

---

### 4. CONTENT EXTRACTION

#### ✅ Fully Implemented
- **HTML Fetching** - Fetches web pages with timeout
- **HTML to Text** - Basic HTML parsing/stripping
- **Capability Extraction** - Pattern-based extraction (Integrations, Security, Compliance, API, Performance, etc.)
- **Pricing Extraction** - V2 pricing extractor with plan names, monthly/annual prices, fees
- **Integration Detection** - Vendor name detection (Shopify, Salesforce, etc.)
- **Compliance Detection** - Framework detection (SOC 2, HIPAA, GDPR, PCI-DSS)
- **Competitor Brand Detection** - Heuristic brand name extraction from titles/domains
- **Content Truncation** - Limits content to 300KB

#### ⚠️ Partially Implemented
- **Feature Extraction** - Old `extractFeatures` exists but may not be used (orchestrator uses capabilities)
- **Evidence Linking** - Evidence model exists but linking may be incomplete
- **Content Caching** - No caching of fetched content
- **Extraction Confidence** - Confidence scores exist but may not be fully utilized

#### ❌ Not Implemented / Errors
- **AI-Powered Extraction** - No LLM-based extraction (all regex/pattern-based)
- **Image/Media Extraction** - No image or media content extraction
- **Structured Data Parsing** - No JSON-LD/schema.org parsing
- **Multi-format Support** - No PDF, DOCX parsing
- **Extraction Retry Logic** - No retry for failed extractions

---

### 5. DATA SYNTHESIS & FINDINGS

#### ✅ Fully Implemented
- **Finding Generation** - Creates COMMON_FEATURE, GAP, DIFFERENTIATOR findings
- **Citation Assignment** - Links findings to sources
- **Confidence Scoring** - Confidence values assigned to findings
- **Gap Analysis** - Compares user keywords to discovered capabilities
- **Differentiator Detection** - Identifies rare/unique capabilities
- **Finding Approval** - Boolean approval flag with UI toggle
- **Finding Notes** - Notes field for reviewer comments

#### ⚠️ Partially Implemented
- **Citation Validation** - Citations array exists but may have empty/invalid IDs
- **Finding Categories** - RISK and RECOMMENDATION kinds exist in schema but may not be generated
- **Evidence Linking** - Evidence model exists but may not be fully populated
- **Finding Confidence Tuning** - Fixed confidence values, no dynamic adjustment

#### ❌ Not Implemented / Errors
- **AI-Generated Insights** - No LLM-based insight generation
- **Finding Clustering** - No grouping of similar findings
- **Finding Prioritization** - No priority/impact scoring
- **Finding Dependencies** - No relationship mapping between findings
- **Historical Trend Analysis** - No comparison across time

---

### 6. REPORT GENERATION

#### ✅ Fully Implemented
- **Markdown Report Generation** - Generates structured markdown reports
- **Vertical-Specific Reports** - Industry-specific sections (Fintech, Healthcare, DevTools, etc.)
- **Report Sections** - Executive Summary, Competitors, Capabilities, Pricing, Integrations, Security, Deployment, GTM, Roadmap
- **Report Format Support** - MARKDOWN format
- **Report Approval** - Approval workflow
- **Report Rebuilding** - Rebuild from approved findings

#### ⚠️ Partially Implemented
- **Citation Formatting** - MarkdownWithCitations component exists but citation tokens `[c:ID]` may not be generated in reports
- **Report Customization** - Vertical profiles control sections but no user-level customization
- **Report Versioning** - Multiple reports per run but no version tracking
- **Report Templates** - Vertical-based templates but no custom templates

#### ❌ Not Implemented / Errors
- **PDF Export** - Endpoint exists but returns HTML, not actual PDF
- **Notion Export** - Endpoint exists but may have integration issues
- **Report Scheduling** - No scheduled report generation
- **Report Sharing** - No shareable links or permissions
- **Report Comparison** - No diff view between reports
- **Interactive Reports** - No interactive charts/visualizations

---

### 7. QA & GUARDRAILS

#### ✅ Fully Implemented
- **Guardrails System** - `evaluateGuardrails` function
- **Citation Validation** - Checks for findings without citations
- **Pricing Citation Requirements** - Requires ≥2 citations for pricing findings
- **Confidence Thresholds** - Warns on low confidence (<0.5)
- **Staleness Detection** - Warns on old sources (>50% stale)
- **QA Summary Report** - Generates QA summary with issues
- **QA Status** - Runs can be in QA status

#### ⚠️ Partially Implemented
- **Guardrail Enforcement** - Issues detected but may not block completion
- **Source Recency** - Staleness check exists but `publishedAt` not always available
- **Error vs Warning** - Level distinction exists but may not be fully enforced

#### ❌ Not Implemented / Errors
- **Automated Fixes** - No auto-fix for guardrail violations
- **Guardrail Customization** - No user-configurable thresholds
- **Guardrail Reporting** - No detailed guardrail reports
- **Source Verification** - No source authenticity verification

---

### 8. USER INTERFACE

#### ✅ Fully Implemented
- **Landing Page** - Marketing page with feature highlights
- **Projects List** - Table with filtering, bulk selection
- **Project Creation Form** - Comprehensive form with all fields
- **Runs List** - Table with status, filtering, pagination
- **Run Detail Page** - Status display, findings view, report preview
- **Review Page** - Findings approval, citation management
- **Settings Page** - Search provider, Notion, guardrails configuration
- **Jobs Page** - Job queue monitoring
- **Evidence Drawer** - Modal for viewing citations
- **Theme Toggle** - Dark/light mode
- **Responsive Design** - Mobile-friendly layouts

#### ⚠️ Partially Implemented
- **Markdown Rendering** - MarkdownWithCitations component exists but citation format may not match
- **Real-time Updates** - Polling-based, not WebSocket
- **Bulk Operations UI** - Exists but may have UX issues
- **Error Display** - Basic alerts, no toast notifications

#### ❌ Not Implemented / Errors
- **Dashboard/Analytics** - No overview dashboard
- **Charts/Visualizations** - No data visualization
- **Keyboard Shortcuts** - No keyboard navigation
- **Export UI** - Export buttons exist but PDF may not work
- **Search/Filter UI** - Basic filters, no advanced search

---

### 9. EXPORT & INTEGRATIONS

#### ✅ Fully Implemented
- **Notion Integration** - API endpoint for Notion export
- **Notion Block Conversion** - Markdown to Notion blocks
- **Notion Connection Testing** - Test endpoint
- **Export Tracking** - Creates report records for exports

#### ⚠️ Partially Implemented
- **PDF Export** - Endpoint exists but returns HTML, not PDF (needs PDF library)
- **Notion Parent Page** - Configurable but may default to env var
- **Export History** - Tracked in reports but no dedicated UI

#### ❌ Not Implemented / Errors
- **CSV Export** - Features CSV endpoint exists but may not be fully functional
- **Excel Export** - No Excel export
- **Slack Integration** - No Slack notifications
- **Email Export** - No email report delivery
- **API Export** - No public API for programmatic access
- **Webhook Integration** - No webhook notifications

---

### 10. AUTHENTICATION & AUTHORIZATION

#### ❌ Not Implemented / Errors
- **User Authentication** - Hardcoded 'demo-user', no auth system
- **User Registration** - No signup/login
- **Session Management** - No session handling
- **Role-Based Access** - No roles/permissions
- **Workspace/Team Support** - No multi-tenant support
- **API Keys** - No API key authentication

---

### 11. CREDITS & BILLING

#### ✅ Fully Implemented
- **Credit Ledger Model** - Database schema for tracking credits
- **Credit Consumption** - `consume()` function
- **Credit Checking** - `canConsume()` function
- **Monthly Limits** - Per-month credit tracking
- **Credit Widget UI** - Placeholder widget in sidebar

#### ⚠️ Partially Implemented
- **Credit Display** - Widget shows hardcoded values (420/1000)
- **Credit API** - `/api/credits/me` endpoint exists but may not be wired
- **Rate Limiting** - Monthly run limits exist but may not use credit system

#### ❌ Not Implemented / Errors
- **Credit Purchase** - No payment integration
- **Credit History** - No transaction history UI
- **Billing Dashboard** - No billing management
- **Usage Analytics** - No detailed usage tracking
- **Credit Alerts** - No low-credit warnings

---

### 12. VERTICAL PROFILES

#### ✅ Fully Implemented
- **Vertical Inference** - Automatically detects vertical from industry/sub-industry
- **Vertical Profiles** - Predefined profiles for:
  - B2B SaaS (default)
  - Fintech
  - Healthcare
  - DevTools
  - API Platform
  - Ecommerce Tool
  - Consumer App
- **Section Configuration** - Each vertical has enabled/disabled sections
- **Query Accents** - Vertical-specific search query enhancements
- **Capability Emphasis** - Vertical-specific capability categories

#### ⚠️ Partially Implemented
- **Custom Verticals** - No user-defined verticals
- **Vertical Switching** - No way to override detected vertical

#### ❌ Not Implemented / Errors
- **Vertical Templates** - No template customization
- **Vertical Analytics** - No vertical-specific metrics

---

### 13. DATA MODELS & RELATIONSHIPS

#### ✅ Fully Implemented
- **Complete Schema** - All models defined:
  - User, Project, ProjectInput
  - Run, Source, Competitor, Feature, Capability
  - PricingPoint, Evidence, Finding, Report
  - Integration, ComplianceItem, CompetitorCapability
  - Job, CreditLedger, AppSetting, RunLog
- **Relationships** - Proper foreign keys and relations
- **Unique Constraints** - Competitor (runId, name) unique
- **Array Fields** - Proper handling of string arrays
- **JSON Fields** - Flexible JSON storage where needed

#### ⚠️ Partially Implemented
- **Notes Fields** - Added to many models but may not be used in UI
- **Approval Fields** - Exists on PricingPoint and Finding but may not be fully utilized
- **Meta Fields** - JSON meta fields exist but may be empty

#### ❌ Not Implemented / Errors
- **Soft Deletes** - No soft delete functionality
- **Audit Logging** - No change tracking
- **Data Validation** - Basic validation, could be more robust
- **Data Migration Tools** - No migration utilities

---

### 14. PERFORMANCE & SCALABILITY

#### ✅ Fully Implemented
- **Database Indexing** - Unique constraints provide indexing
- **Transaction Batching** - Uses Prisma transactions for bulk operations
- **Content Truncation** - Limits content size
- **Timeout Handling** - Fetch timeouts implemented

#### ⚠️ Partially Implemented
- **Caching** - Settings caching exists but limited
- **Pagination** - Runs list has pagination but may not be optimized
- **Background Processing** - Job system exists but not actively used

#### ❌ Not Implemented / Errors
- **CDN Integration** - No CDN for static assets
- **Database Connection Pooling** - Relies on Prisma defaults
- **Rate Limiting** - Basic rate limiting but no sophisticated throttling
- **Caching Strategy** - No comprehensive caching layer
- **Load Balancing** - No load balancing considerations

---

## Summary Statistics

- **Fully Implemented**: ~60 features
- **Partially Implemented**: ~35 features  
- **Not Implemented / Errors**: ~45 features

## Critical Issues to Address

1. **Authentication System** - Currently using hardcoded 'demo-user'
2. **Job Queue Processing** - Worker needs external cron trigger
3. **PDF Export** - Returns HTML instead of actual PDF
4. **Citation Format** - MarkdownWithCitations expects `[c:ID]` but reports may not generate this
5. **Direct Orchestration Calls** - Should use job queue instead
6. **Credit System Integration** - Credit checking not wired to run creation
7. **Evidence Linking** - Evidence model exists but may not be fully populated

## Architecture Notes

- **Tech Stack**: Next.js 16, React 19, Prisma, PostgreSQL, Tailwind CSS v4
- **Pattern**: Server Components with Client Components for interactivity
- **Database**: PostgreSQL with Prisma ORM
- **Deployment**: Designed for Vercel/serverless (Edge Runtime considerations addressed)
- **Custom Prisma Output**: Generated to `app/generated/prisma` instead of default location

