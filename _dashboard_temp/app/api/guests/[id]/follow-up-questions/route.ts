import { NextResponse } from 'next/server';
import { pool } from '@/lib/pool';
import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `You are helping Joe, the founder of Con-Vive (a curated dinner party experience), write follow-up questions to send guests via text message.

Joe has reviewed the guest's social media profile and signup form. He wants to send 2-3 casual, curious questions that feel like he personally browsed their profile and something caught his eye. These questions replace a phone call, so they need to:

1. Feel genuinely curious, not interrogative or formal
2. Be answerable in 1-3 sentences via text (not essay questions)
3. Reference specific details from their profile, work, or interests - never generic
4. Sound like Joe texting naturally - warm, casual, no corporate language
5. Open a thread that reveals personality, not just facts
6. Never mention that data came from a database, enrichment tool, or algorithm

Bad examples (too generic, too formal, or too long):
- "What inspired you to get into your field?"
- "Tell me about your journey as an entrepreneur"
- "What are your hobbies outside of work?"

Good examples (specific, casual, text-friendly):
- "Saw you spent time in Oaxaca - did you get into mezcal or was it more about the food?"
- "Your work in marine conservation is fascinating. What's one thing most people get wrong about ocean health?"
- "I noticed you're into sourdough and also do ultramarathons - is there a patience connection there or am I reaching?"

Return ONLY a JSON array of exactly 3 strings. No preamble, no markdown, no explanation.`;

interface GuestData {
  first_name: string | null;
  last_name: string | null;
  one_thing: string | null;
  about: string | null;
  curious_about: string | null;
  surprising_knowledge: string | null;
  what_do_you_do: string | null;
  social_summary: unknown | null;
  age_range: string | null;
  solo_or_couple: string | null;
  hosting_interest: string | null;
  dietary_restrictions: string[] | null;
  dietary_notes: string | null;
  summarized_transcript: string | null;
}

interface InvitationHistory {
  dinner_name: string;
  dinner_date: Date;
  response: string;
}

function parseTranscript(transcript: string | null): string | null {
  if (!transcript) return null;

  try {
    const parsed = JSON.parse(transcript);
    if (parsed && typeof parsed === 'object' && parsed.type === 'text' && parsed.text) {
      return parsed.text;
    }
    return transcript;
  } catch {
    return transcript;
  }
}

function buildUserPrompt(guest: GuestData, invitations: InvitationHistory[]): string {
  const parts: string[] = [];

  const name = [guest.first_name, guest.last_name].filter(Boolean).join(' ');
  if (name) {
    parts.push(`Guest name: ${name}`);
  }

  if (guest.what_do_you_do) {
    parts.push(`What they do: ${guest.what_do_you_do}`);
  }

  if (guest.about) {
    parts.push(`About themselves: ${guest.about}`);
  }

  if (guest.one_thing) {
    parts.push(`One thing they want others to know: ${guest.one_thing}`);
  }

  if (guest.curious_about) {
    parts.push(`What they're curious about: ${guest.curious_about}`);
  }

  if (guest.surprising_knowledge) {
    parts.push(`Surprising knowledge they have: ${guest.surprising_knowledge}`);
  }

  if (guest.age_range) {
    parts.push(`Age range: ${guest.age_range}`);
  }

  if (guest.solo_or_couple) {
    parts.push(`Attending as: ${guest.solo_or_couple}`);
  }

  if (guest.hosting_interest) {
    parts.push(`Interest in hosting: ${guest.hosting_interest}`);
  }

  if (guest.dietary_restrictions && guest.dietary_restrictions.length > 0) {
    parts.push(`Dietary restrictions: ${guest.dietary_restrictions.join(', ')}`);
  }

  if (guest.dietary_notes) {
    parts.push(`Dietary notes: ${guest.dietary_notes}`);
  }

  const transcript = parseTranscript(guest.summarized_transcript);
  if (transcript) {
    parts.push(`Summary from previous conversation: ${transcript}`);
  }

  if (guest.social_summary && typeof guest.social_summary === 'object') {
    const summary = guest.social_summary as Record<string, unknown>;
    const socialParts: string[] = [];

    if (summary.inferred_role) {
      socialParts.push(`Role: ${summary.inferred_role}`);
    }
    if (Array.isArray(summary.industries) && summary.industries.length > 0) {
      socialParts.push(`Industries: ${summary.industries.join(', ')}`);
    }
    if (Array.isArray(summary.interests) && summary.interests.length > 0) {
      socialParts.push(`Interests: ${summary.interests.join(', ')}`);
    }
    if (summary.conversational_vibe) {
      socialParts.push(`Conversational vibe: ${summary.conversational_vibe}`);
    }
    if (summary.guest_note) {
      socialParts.push(`Guest note: ${summary.guest_note}`);
    }
    if (summary.curiosity_signals) {
      socialParts.push(`Curiosity signals: ${summary.curiosity_signals}`);
    }

    if (socialParts.length > 0) {
      parts.push(`Social media profile insights:\n${socialParts.join('\n')}`);
    }
  }

  if (invitations.length > 0) {
    const invitationSummary = invitations
      .map(inv => `- ${inv.dinner_name} (${new Date(inv.dinner_date).toLocaleDateString()}): ${inv.response}`)
      .join('\n');
    parts.push(`Dinner invitation history:\n${invitationSummary}`);
  }

  return parts.join('\n\n');
}

function hasEnoughData(guest: GuestData): boolean {
  const meaningfulFields = [
    guest.one_thing,
    guest.about,
    guest.curious_about,
    guest.surprising_knowledge,
    guest.what_do_you_do,
    guest.social_summary,
    parseTranscript(guest.summarized_transcript),
  ];

  return meaningfulFields.some(field => field !== null && field !== undefined && field !== '');
}

function parseQuestionsResponse(text: string): string[] {
  let jsonText = text.trim();

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

  // Try to extract JSON array
  const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    jsonText = jsonMatch[0];
  }

  const parsed = JSON.parse(jsonText);

  if (!Array.isArray(parsed) || parsed.length !== 3 || !parsed.every(q => typeof q === 'string')) {
    throw new Error('Response must be an array of exactly 3 strings');
  }

  return parsed;
}

export async function POST(
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

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Fetch guest profile
    const guestResult = await pool.query<GuestData>(
      `SELECT g.first_name, g.last_name, g.one_thing, g.about,
        g.curious_about, g.surprising_knowledge, g.what_do_you_do,
        g.social_summary, g.age_range, g.solo_or_couple,
        g.hosting_interest, g.dietary_restrictions, g.dietary_notes,
        t.summarized_transcript
      FROM guests g
      LEFT JOIN transcripts t ON t.guest_id = g.id
      WHERE g.id = $1`,
      [id]
    );

    if (guestResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Guest not found' },
        { status: 404 }
      );
    }

    const guest = guestResult.rows[0];

    // Check for sufficient data
    if (!hasEnoughData(guest)) {
      return NextResponse.json(
        { error: 'Not enough profile data to generate meaningful questions' },
        { status: 400 }
      );
    }

    // Fetch invitation history
    const invitationsResult = await pool.query<InvitationHistory>(
      `SELECT d.dinner_name, d.dinner_date, i.response
      FROM invitations i
      JOIN dinners d ON d.id = i.dinner_id
      WHERE i.guest_id = $1
      ORDER BY d.dinner_date DESC`,
      [id]
    );

    const invitations = invitationsResult.rows;

    // Build user prompt
    const userPrompt = buildUserPrompt(guest, invitations);

    // Call Anthropic API
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    let questions: string[] | null = null;
    let lastError: Error | null = null;

    // Try up to 2 times if parsing fails
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        temperature: 0.9,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const textContent = response.content.find(c => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        lastError = new Error('No text response from Claude');
        continue;
      }

      try {
        questions = parseQuestionsResponse(textContent.text);
        break;
      } catch (e) {
        lastError = e instanceof Error ? e : new Error('Failed to parse response');
        console.error(`Attempt ${attempt + 1} failed to parse:`, textContent.text);
      }
    }

    if (!questions) {
      return NextResponse.json(
        { error: lastError?.message || 'Failed to generate questions' },
        { status: 500 }
      );
    }

    return NextResponse.json({ questions });
  } catch (error) {
    console.error('Error generating follow-up questions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate questions' },
      { status: 500 }
    );
  }
}
