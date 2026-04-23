import { NextResponse } from 'next/server';
import { updateGuest } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

type Platform = 'linkedin' | 'instagram';

interface SocialSummary {
  inferred_role: string;
  industries: string[];
  interests: string[];
  conversational_vibe: string;
  guest_note: string;
  curiosity_signals: string;
  source_url: string;
  source_platform: Platform;
  enriched_at: string;
}

function detectPlatform(url: string): Platform | null {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('linkedin.com')) return 'linkedin';
  if (lowerUrl.includes('instagram.com')) return 'instagram';
  return null;
}

async function runApifyScraper(url: string, platform: Platform): Promise<unknown> {
  const apifyToken = process.env.APIFY_TOKEN;
  if (!apifyToken) {
    throw new Error('APIFY_TOKEN not configured');
  }

  const actorId = platform === 'linkedin'
    ? 'dev_fusion~Linkedin-Profile-Scraper'
    : 'apify~instagram-scraper';

  // Build input based on platform (different actors expect different schemas)
  let input;
  if (platform === 'linkedin') {
    input = { profileUrls: [url] };
    // Add cookie if provided via env var
    const linkedinCookie = process.env.LINKEDIN_COOKIE;
    if (linkedinCookie) {
      input = { ...input, cookie: linkedinCookie };
    }
  } else {
    input = { directUrls: [url], resultsType: 'details' };
  }

  // Start the actor run
  const startResponse = await fetch(
    `https://api.apify.com/v2/acts/${actorId}/runs?token=${apifyToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }
  );

  if (!startResponse.ok) {
    const error = await startResponse.text();
    throw new Error(`Failed to start Apify actor: ${error}`);
  }

  const runData = await startResponse.json();
  const runId = runData.data.id;

  // Poll for completion
  const maxAttempts = 60; // 5 minutes max
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

    const statusResponse = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`
    );

    if (!statusResponse.ok) {
      throw new Error('Failed to check actor run status');
    }

    const statusData = await statusResponse.json();
    const status = statusData.data.status;

    if (status === 'SUCCEEDED') {
      // Get dataset items
      const datasetId = statusData.data.defaultDatasetId;
      const datasetResponse = await fetch(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}`
      );

      if (!datasetResponse.ok) {
        throw new Error('Failed to fetch dataset');
      }

      const items = await datasetResponse.json();
      const item = items[0];

      // Check if the scraper returned an error
      if (item && (item.success === false || item.error)) {
        throw new Error(item.error || 'Profile enrichment failed');
      }

      // Check if we got meaningful data (LinkedIn-specific check)
      if (platform === 'linkedin' && item && !item.firstName && !item.fullName && !item.headline) {
        console.error('LinkedIn scraper returned:', JSON.stringify(item));
        throw new Error('LinkedIn profile data unavailable - profile may be private');
      }

      return item || null;
    }

    if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
      throw new Error(`Actor run ${status.toLowerCase()}`);
    }
  }

  throw new Error('Actor run timed out');
}

// Truncate text to stay within token limits (roughly 4 chars per token)
const MAX_PROFILE_CHARS = 50000; // ~12,500 tokens, leaves room for prompt

function truncateProfileData(data: unknown): string {
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  if (text.length <= MAX_PROFILE_CHARS) {
    return text;
  }
  return text.slice(0, MAX_PROFILE_CHARS) + '\n\n[... truncated for length ...]';
}

async function extractWithClaude(profileData: unknown): Promise<Omit<SocialSummary, 'source_url' | 'source_platform' | 'enriched_at'>> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const client = new Anthropic({ apiKey: anthropicKey });

  const truncatedData = truncateProfileData(profileData);

  const prompt = `Extract the following from this social profile and return as JSON:
- inferred_role: their job or what they seem to do
- industries: array of relevant industries/fields
- interests: array of topics they genuinely seem interested in
- conversational_vibe: 1 sentence — are they a seller, an analyst, a connector, etc.
- guest_note: 1 sentence Joe can use when planning a table — what makes them an interesting addition
- curiosity_signals: any evidence they ask questions, explore outside their lane, show intellectual range

Profile data:
${truncatedData}

Return ONLY valid JSON, no markdown.`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const textContent = message.content.find(c => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  let jsonText = textContent.text.trim();

  // Strip markdown code blocks if present
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.slice(7);
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.slice(3);
  }
  if (jsonText.endsWith('```')) {
    jsonText = jsonText.slice(0, -3);
  }
  jsonText = jsonText.trim();

  // Try to extract JSON object if there's extra text
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonText = jsonMatch[0];
  }

  try {
    return JSON.parse(jsonText);
  } catch (e) {
    console.error('Failed to parse JSON:', jsonText);
    throw new Error('Failed to parse Claude response as JSON');
  }
}

// POST: Run enrichment (Apify scrape for Instagram, direct Claude for LinkedIn text)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params; // Validate params exist

    const body = await request.json();
    const { url, profileText, platform: explicitPlatform } = body;

    // Mode 1: LinkedIn profile text pasted directly
    if (profileText && typeof profileText === 'string') {
      const extractedData = await extractWithClaude(profileText);

      const result: SocialSummary = {
        ...extractedData,
        source_url: '',
        source_platform: (explicitPlatform as Platform) || 'linkedin',
        enriched_at: new Date().toISOString(),
      };

      return NextResponse.json({ result });
    }

    // Mode 2: Instagram URL (use Apify)
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL or profile text is required' },
        { status: 400 }
      );
    }

    const platform = detectPlatform(url);
    if (!platform) {
      return NextResponse.json(
        { error: 'URL must be a LinkedIn or Instagram profile URL' },
        { status: 400 }
      );
    }

    if (platform === 'linkedin') {
      return NextResponse.json(
        { error: 'For LinkedIn, please copy/paste the profile text instead of the URL' },
        { status: 400 }
      );
    }

    // Run Apify scraper (Instagram only)
    const profileData = await runApifyScraper(url, platform);
    if (!profileData) {
      return NextResponse.json(
        { error: 'No profile data found' },
        { status: 404 }
      );
    }

    // Extract insights with Claude
    const extractedData = await extractWithClaude(profileData);

    const result: SocialSummary = {
      ...extractedData,
      source_url: url,
      source_platform: platform,
      enriched_at: new Date().toISOString(),
    };

    return NextResponse.json({ result });
  } catch (error) {
    console.error('Error running enrichment:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to run enrichment' },
      { status: 500 }
    );
  }
}

// PATCH: Save enrichment result to guest profile
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!process.env.DATABASE_PUBLIC_URL && !process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'DATABASE_PUBLIC_URL not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { socialSummary } = body;

    if (!socialSummary || typeof socialSummary !== 'object') {
      return NextResponse.json(
        { error: 'socialSummary object is required' },
        { status: 400 }
      );
    }

    const updatedGuest = await updateGuest(id, {
      'Social Summary': socialSummary,
    });

    return NextResponse.json(updatedGuest);
  } catch (error) {
    console.error('Error saving social summary:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save social summary' },
      { status: 500 }
    );
  }
}
