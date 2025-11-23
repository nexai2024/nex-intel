import { log } from './logger';
import { loadSettings } from './config';
import type { Prisma } from '@/app/generated/prisma/client';
import type { VerticalProfile } from './verticals';

// LLM Provider Types
export type LLMProvider = 'openai' | 'gemini' | 'anthropic' | null;

// Extracted capability from AI extraction
export type ExtractedCapability = {
  name: string;
  description: string;
  category: string;
};

// Normalized capability after standardization and filtering
export type NormalizedCapability = {
  normalizedName: string; // The canonical name to save (e.g., "Role-Based Access Control")
  category: string;       // Re-categorized based on standardization
  sourceName: string;     // The original, messy name for debugging/evidence
  description: string;
  keep: boolean;          // AI decides if this is worth keeping for the current vertical
};

// Structured output for Extraction phase
export type ExtractedCompetitorData = {
  capabilities: ExtractedCapability[];
  pricingPlans: {
    planName: string;
    priceMonthly: number | null;
    priceAnnual: number | null;
    transactionFee: number | null;
    currency: string;
    details: string[];
  }[];
  complianceItems: {
    framework: string;
    status: string | null;
    notes: string | null;
  }[];
  integrations: {
    name: string;
    vendor: string | null;
    category: string | null;
    url: string | null;
  }[];
  summary: string; // AI-generated summary of the page content
};

// Structured output for Synthesis phase
export type SyntheticInsights = {
  executiveSummary: string;
  risks: {
    text: string;
    citations: string[];
    confidence: number;
  }[];
  recommendations: {
    text: string;
    citations: string[];
    confidence: number;
  }[];
};

/**
 * Extracts structured data from raw web content using LLM
 */
export async function extractStructuredDataFromContent(
  competitorName: string,
  pageContent: string,
  projectContext?: { industry?: string | null; keywords?: string[] }
): Promise<ExtractedCompetitorData | null> {
  if (!pageContent || pageContent.trim().length === 0) {
    log.warn('Skipping AI extraction: Page content is empty');
    return null;
  }

  const settings = await loadSettings();
  const provider = (settings.aiProvider as LLMProvider) ?? null;

  if (!provider) {
    log.warn('No AI provider configured. Skipping AI extraction. Set AI_PROVIDER and API key in settings.');
    return null;
  }

  // Truncate content to reasonable size (most LLMs have token limits)
  const maxContentLength = 200_000; // ~50K tokens
  const truncatedContent = pageContent.length > maxContentLength
    ? pageContent.slice(0, maxContentLength) + '\n\n[Content truncated...]'
    : pageContent;

  const systemPrompt = `You are an expert competitive intelligence analyst. Extract structured data about ${competitorName} from the provided web page content. Return ONLY valid JSON matching the exact schema provided. Do not include any explanatory text outside the JSON.`;

  const userPrompt = `Competitor: ${competitorName}
${projectContext?.industry ? `Industry: ${projectContext.industry}` : ''}
${projectContext?.keywords?.length ? `Keywords: ${projectContext.keywords.join(', ')}` : ''}

Web Page Content:
---
${truncatedContent}
---

Extract all capabilities, pricing plans, compliance certifications, and integrations mentioned for ${competitorName}. Return the data as a JSON object with this exact structure:
{
  "capabilities": [{"name": "string", "description": "string", "category": "string"}],
  "pricingPlans": [{"planName": "string", "priceMonthly": number|null, "priceAnnual": number|null, "transactionFee": number|null, "currency": "string", "details": ["string"]}],
  "complianceItems": [{"framework": "string", "status": "string|null", "notes": "string|null"}],
  "integrations": [{"name": "string", "vendor": "string|null", "category": "string|null", "url": "string|null"}],
  "summary": "2-3 sentence summary of the page"
}`;

  try {
    const response = await callLLM(provider, systemPrompt, userPrompt, {
      responseFormat: 'json_object',
      temperature: 0.1, // Low temperature for consistent extraction
    });

    if (!response) {
      log.error('LLM returned empty response for extraction');
      return null;
    }

    // Parse and validate response
    const parsed = typeof response === 'string' ? JSON.parse(response) : response;
    
    // Validate structure
    const result: ExtractedCompetitorData = {
      capabilities: Array.isArray(parsed.capabilities) ? parsed.capabilities : [],
      pricingPlans: Array.isArray(parsed.pricingPlans) ? parsed.pricingPlans : [],
      complianceItems: Array.isArray(parsed.complianceItems) ? parsed.complianceItems : [],
      integrations: Array.isArray(parsed.integrations) ? parsed.integrations : [],
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    };

    log.info(`Extracted ${result.capabilities.length} capabilities, ${result.pricingPlans.length} pricing plans, ${result.complianceItems.length} compliance items for ${competitorName}`);
    return result;
  } catch (error: any) {
    log.error({ error, competitorName }, 'AI extraction failed');
    return null;
  }
}

/**
 * Generates synthetic insights (Risks, Recommendations, Executive Summary) from extracted data
 */
export async function generateSyntheticInsights(
  runData: {
    project: { name: string; industry?: string | null; description?: string | null; targetSegments?: string[] };
    competitors: Array<{
      name: string;
      capabilities?: Array<{ name: string; category: string; description?: string | null }>;
      pricingPoints?: Array<{ planName: string; priceMonthly?: number | null; priceAnnual?: number | null }>;
    }>;
    capabilities?: Array<{ name: string; category: string; normalized: string }>;
    pricingPoints?: Array<{ planName: string; priceMonthly?: number | null; competitorId?: string }>;
    findings?: Array<{ kind: string; text: string }>;
  },
  projectInputs?: { keywords?: string[]; problem?: string | null; solution?: string | null }
): Promise<SyntheticInsights | null> {
  const settings = await loadSettings();
  const provider = (settings.aiProvider as LLMProvider) ?? null;

  if (!provider) {
    log.warn('No AI provider configured. Skipping AI synthesis. Set AI_PROVIDER and API key in settings.');
    return null;
  }

  // Prepare context for LLM
  const context = {
    projectName: runData.project.name,
    industry: runData.project.industry || 'Unknown',
    targetSegments: runData.project.targetSegments || [],
    keywords: projectInputs?.keywords || [],
    competitorCount: runData.competitors.length,
    capabilitiesFound: runData.capabilities?.length || 0,
    pricingPlansFound: runData.pricingPoints?.length || 0,
    existingFindings: runData.findings || [],
  };

  const systemPrompt = `You are a Chief Competitive Strategist. Analyze the provided competitive intelligence data and generate strategic insights in the form of Risks and Recommendations. Be specific, actionable, and cite data points to support your insights.`;

  const userPrompt = `Project: ${context.projectName}
Industry: ${context.industry}
Target Segments: ${context.targetSegments.join(', ')}
${context.keywords.length ? `Focus Keywords: ${context.keywords.join(', ')}` : ''}

Competitive Data:
- ${context.competitorCount} competitors analyzed
- ${context.capabilitiesFound} capabilities identified
- ${context.pricingPlansFound} pricing plans found

${runData.competitors.length > 0 ? `\nCompetitors:\n${runData.competitors.map(c => `- ${c.name}: ${c.capabilities?.length || 0} capabilities, ${c.pricingPoints?.length || 0} pricing plans`).join('\n')}` : ''}

${runData.capabilities?.length ? `\nKey Capabilities:\n${runData.capabilities.slice(0, 20).map(c => `- ${c.category}: ${c.name}`).join('\n')}` : ''}

${runData.findings?.length ? `\nExisting Findings:\n${runData.findings.slice(0, 10).map(f => `- [${f.kind}] ${f.text}`).join('\n')}` : ''}

Generate:
1. A 3-paragraph Executive Summary analyzing the competitive landscape
2. 3-5 strategic RISKs (threats or challenges based on competitor strengths)
3. 3-5 actionable RECOMMENDATIONs (what the project should do based on market gaps)

Return as JSON:
{
  "executiveSummary": "string",
  "risks": [{"text": "string", "citations": ["capability name or finding reference"], "confidence": 0.0-1.0}],
  "recommendations": [{"text": "string", "citations": ["capability name or finding reference"], "confidence": 0.0-1.0}]
}`;

  try {
    const response = await callLLM(provider, systemPrompt, userPrompt, {
      responseFormat: 'json_object',
      temperature: 0.7, // Higher temperature for creative insights
    });

    if (!response) {
      log.error('LLM returned empty response for synthesis');
      return null;
    }

    const parsed = typeof response === 'string' ? JSON.parse(response) : response;

    const result: SyntheticInsights = {
      executiveSummary: typeof parsed.executiveSummary === 'string' ? parsed.executiveSummary : '',
      risks: Array.isArray(parsed.risks) ? parsed.risks.map((r: any) => ({
        text: r.text || '',
        citations: Array.isArray(r.citations) ? r.citations : [],
        confidence: typeof r.confidence === 'number' ? Math.max(0, Math.min(1, r.confidence)) : 0.85,
      })) : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.map((r: any) => ({
        text: r.text || '',
        citations: Array.isArray(r.citations) ? r.citations : [],
        confidence: typeof r.confidence === 'number' ? Math.max(0, Math.min(1, r.confidence)) : 0.85,
      })) : [],
    };

    log.info(`Generated ${result.risks.length} risks and ${result.recommendations.length} recommendations`);
    return result;
  } catch (error: any) {
    log.error({ error }, 'AI synthesis failed');
    return null;
  }
}

// LLM Client Implementation
type LLMCallOptions = {
  responseFormat?: 'json_object' | 'text';
  temperature?: number;
  maxTokens?: number;
};

async function callLLM(
  provider: LLMProvider,
  systemPrompt: string,
  userPrompt: string,
  options: LLMCallOptions = {}
): Promise<string | object | null> {
  const settings = await loadSettings();

  try {
    switch (provider) {
      case 'openai':
        return await callOpenAI(systemPrompt, userPrompt, options, settings);
      case 'gemini':
        return await callGemini(systemPrompt, userPrompt, options, settings);
      case 'anthropic':
        return await callAnthropic(systemPrompt, userPrompt, options, settings);
      default:
        log.warn(`Unsupported LLM provider: ${provider}`);
        return null;
    }
  } catch (error: any) {
    log.error({ error, provider }, 'LLM call failed');
    throw error;
  }
}

async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  options: LLMCallOptions,
  settings: any
): Promise<string | object | null> {
  const apiKey = settings.openaiApiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  // Dynamic import for OpenAI SDK (optional dependency)
  try {
    // @ts-ignore - dynamic import
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey });

    const response = await client.chat.completions.create({
      model: settings.openaiModel || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: options.responseFormat === 'json_object' ? { type: 'json_object' } : undefined,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    if (options.responseFormat === 'json_object') {
      try {
        return JSON.parse(content);
      } catch {
        return content;
      }
    }
    return content;
  } catch (error: any) {
    if (error.code === 'MODULE_NOT_FOUND') {
      log.warn('OpenAI SDK not installed. Install with: npm install openai');
      throw new Error('OpenAI SDK not installed');
    }
    throw error;
  }
}

async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  options: LLMCallOptions,
  settings: any
): Promise<string | object | null> {
  const apiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  try {
    // @ts-ignore - dynamic import
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    
    const model = genAI.getGenerativeModel({ 
      model: settings.geminiModel || 'gemini-1.5-flash',
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 4000,
        responseMimeType: options.responseFormat === 'json_object' ? 'application/json' : 'text/plain',
      },
    });

    const prompt = `${systemPrompt}\n\n${userPrompt}`;
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    if (options.responseFormat === 'json_object') {
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }
    return text;
  } catch (error: any) {
    if (error.code === 'MODULE_NOT_FOUND') {
      log.warn('Google Generative AI SDK not installed. Install with: npm install @google/generative-ai');
      throw new Error('Google Generative AI SDK not installed');
    }
    throw error;
  }
}

async function callAnthropic(
  systemPrompt: string,
  userPrompt: string,
  options: LLMCallOptions,
  settings: any
): Promise<string | object | null> {
  const apiKey = settings.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('Anthropic API key not configured');
  }

  try {
    // @ts-ignore - dynamic import
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: settings.anthropicModel || 'claude-3-5-sonnet-20241022',
      max_tokens: options.maxTokens ?? 4000,
      temperature: options.temperature ?? 0.7,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') return null;

    const text = content.text;
    if (options.responseFormat === 'json_object') {
      try {
        // Claude may return text wrapped in markdown code blocks
        const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(cleaned);
      } catch {
        return text;
      }
    }
    return text;
  } catch (error: any) {
    if (error.code === 'MODULE_NOT_FOUND') {
      log.warn('Anthropic SDK not installed. Install with: npm install @anthropic-ai/sdk');
      throw new Error('Anthropic SDK not installed');
    }
    throw error;
  }
}

/**
 * Uses an LLM to normalize capability names and filter them based on the Vertical Profile.
 * This ensures consistency (canonical names) and relevance (vertical-specific filtering).
 * 
 * @param capabilities The raw capabilities extracted from the webpage.
 * @param verticalProfile The active vertical profile (e.g., FINTECH, DEVTOOLS).
 * @returns A list of standardized and relevant capabilities.
 */
export async function standardizeAndFilterCapabilities(
  capabilities: ExtractedCapability[],
  verticalProfile: VerticalProfile
): Promise<NormalizedCapability[]> {
  if (capabilities.length === 0) return [];

  const settings = await loadSettings();
  const provider = (settings.aiProvider as LLMProvider) ?? null;

  if (!provider) {
    log.warn('No AI provider configured. Skipping capability standardization. Set AI_PROVIDER and API key in settings.');
    // Return capabilities as-is without filtering if AI is not available
    return capabilities.map(cap => ({
      normalizedName: cap.name,
      category: cap.category,
      sourceName: cap.name,
      description: cap.description,
      keep: true, // Keep all if no AI standardization
    }));
  }

  // Prepare vertical context for the LLM
  const emphasis = verticalProfile.emphasize;
  const filterContext = `Project Vertical: ${verticalProfile.key}.
Target Categories: ${emphasis.capabilities.join(', ')}.
${emphasis.mustHave?.length ? `Must-Haves: ${emphasis.mustHave.join(', ')}.` : ''}
${emphasis.compliance?.length ? `Compliance Focus: ${emphasis.compliance.join(', ')}.` : ''}
Filter out any capabilities NOT relevant to this context.`;

  const systemPrompt = `You are a feature standardization engine. For each capability provided:

1. Map its name to a concise, canonical, and normalized English term (e.g., 'RBAC' -> 'Role-Based Access Control', 'SSO' -> 'Single Sign-On', 'MFA' -> 'Multi-Factor Authentication').

2. Re-categorize the capability into one of the standard categories: Integrations, Security, Compliance, API, Performance, Automation, Analytics, Permissions, Growth, or Other.

3. Review the capability against the provided Vertical Profile context.

4. Set 'keep' to true ONLY if:
   - The capability is relevant to the vertical's target categories
   - The capability is a core SaaS feature (security, integrations, analytics, etc.)
   - The capability matches one of the must-have items
   Otherwise, set 'keep' to false.

You MUST return a JSON object with a "capabilities" array conforming to the exact schema.`;

  const userPrompt = `Vertical Context: ${filterContext}

---

Capabilities to Standardize and Filter:

${JSON.stringify(capabilities, null, 2)}

Return a JSON object with this structure:
{
  "capabilities": [
    {
      "normalizedName": "string (canonical name)",
      "category": "string (standard category)",
      "sourceName": "string (original name)",
      "description": "string",
      "keep": boolean
    }
  ]
}`;

  try {
    const response = await callLLM(provider, systemPrompt, userPrompt, {
      responseFormat: 'json_object',
      temperature: 0.2, // Low temperature for consistent standardization
    });

    if (!response) {
      log.error('LLM returned empty response for standardization');
      return capabilities.map(cap => ({
        normalizedName: cap.name,
        category: cap.category,
        sourceName: cap.name,
        description: cap.description,
        keep: true, // Default to keeping if standardization fails
      }));
    }

    // Parse response - LLM should return an object with a "capabilities" array
    const parsed = typeof response === 'string' ? JSON.parse(response) : response;
    
    // Handle different response formats
    let normalizedArray: NormalizedCapability[] = [];
    if (Array.isArray(parsed)) {
      normalizedArray = parsed;
    } else if (Array.isArray(parsed.capabilities)) {
      normalizedArray = parsed.capabilities;
    } else if (Array.isArray(parsed.result)) {
      normalizedArray = parsed.result;
    } else {
      log.warn('Unexpected response format from LLM standardization');
      // Fallback: keep all capabilities as-is
      return capabilities.map(cap => ({
        normalizedName: cap.name,
        category: cap.category,
        sourceName: cap.name,
        description: cap.description,
        keep: true,
      }));
    }

    // Validate and filter results
    const valid = normalizedArray
      .filter((item: any): item is NormalizedCapability => 
        item &&
        typeof item.normalizedName === 'string' &&
        typeof item.category === 'string' &&
        typeof item.sourceName === 'string' &&
        typeof item.description === 'string' &&
        typeof item.keep === 'boolean'
      )
      .filter(c => c.keep); // Only keep relevant capabilities

    log.info(`Standardized ${capabilities.length} capabilities to ${valid.length} relevant capabilities for vertical ${verticalProfile.key}`);
    return valid;
  } catch (error: any) {
    log.error({ error, verticalProfile: verticalProfile.key }, 'AI standardization failed');
    // Fallback: keep all capabilities as-is if standardization fails
    return capabilities.map(cap => ({
      normalizedName: cap.name,
      category: cap.category,
      sourceName: cap.name,
      description: cap.description,
      keep: true,
    }));
  }
}
