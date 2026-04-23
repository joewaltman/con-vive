import { NextResponse } from 'next/server';
import { pool } from '@/lib/pool';
import Anthropic from '@anthropic-ai/sdk';
import { format } from 'date-fns';
import type { GuestReminder, ReminderResponse } from '@/lib/types';

interface DinnerRow {
  id: number;
  dinner_name: string;
  dinner_date: string | Date;
  start_time: string;
  menu: string | null;
  host_address: string | null;
  host_city: string | null;
}

interface GuestRow {
  id: number;
  first_name: string;
  last_name: string;
  phone: string | null;
  what_do_you_do: string | null;
  about: string | null;
  one_thing: string | null;
  curious_about: string | null;
  surprising_knowledge: string | null;
  social_summary: {
    guest_note?: string;
    conversational_vibe?: string;
    interests?: string[];
  } | null;
  summarized_transcript: string | null;
}

interface BringItemClaimRow {
  guest_id: number;
  category: string;
  description: string | null;
}

interface GuestProfile {
  guestId: number;
  firstName: string;
  profileText: string;
}

interface GeneratedBio {
  guestId: number;
  bio: string;
}

function buildGuestProfile(guest: GuestRow): string {
  const parts: string[] = [];

  if (guest.what_do_you_do) {
    parts.push(`Work: ${guest.what_do_you_do}`);
  }
  if (guest.about) {
    parts.push(`About: ${guest.about}`);
  }
  if (guest.one_thing) {
    parts.push(`One thing: ${guest.one_thing}`);
  }
  if (guest.curious_about) {
    parts.push(`Curious about: ${guest.curious_about}`);
  }
  if (guest.surprising_knowledge) {
    parts.push(`Surprising knowledge: ${guest.surprising_knowledge}`);
  }

  // Parse social_summary JSONB
  if (guest.social_summary) {
    if (guest.social_summary.guest_note) {
      parts.push(`Guest note: ${guest.social_summary.guest_note}`);
    }
    if (guest.social_summary.conversational_vibe) {
      parts.push(`Vibe: ${guest.social_summary.conversational_vibe}`);
    }
    if (guest.social_summary.interests?.length) {
      parts.push(`Interests: ${guest.social_summary.interests.join(', ')}`);
    }
  }

  // Parse summarized_transcript (may be JSON with type/text structure)
  if (guest.summarized_transcript) {
    let transcriptText = guest.summarized_transcript;
    try {
      const parsed = JSON.parse(guest.summarized_transcript);
      if (parsed.text) {
        transcriptText = parsed.text;
      } else if (typeof parsed === 'string') {
        transcriptText = parsed;
      }
    } catch {
      // Not JSON, use as-is
    }
    parts.push(`Call notes: ${transcriptText}`);
  }

  // Truncate to ~500 chars
  const combined = parts.join('\n');
  return combined.length > 500 ? combined.slice(0, 500) + '...' : combined;
}

function formatTime(startTime: string): string {
  if (!startTime) return '';
  const [hours] = startTime.split(':');
  const hour = parseInt(hours);
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  return hour > 12 ? `${hour - 12}pm` : `${hour}am`;
}

async function generateBiosWithClaude(profiles: GuestProfile[]): Promise<GeneratedBio[]> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const client = new Anthropic({ apiKey: anthropicKey });

  const systemPrompt = `Generate one-liner bios (15-25 words) for dinner guests.
Rules:
- Warm, specific, conversational tone
- First name only
- Focus on what makes them interesting at a dinner table
- NEVER mention sad or sensitive topics (death, illness, divorce, loss, being widowed, etc.)
- Keep it upbeat and forward-looking
- NEVER use em dashes anywhere in the output
- Return ONLY a JSON array: [{ "guestId": 123, "bio": "..." }, ...]`;

  const userContent = profiles.map(p => ({
    guestId: p.guestId,
    firstName: p.firstName,
    profile: p.profileText,
  }));

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: 'user', content: JSON.stringify(userContent) }],
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

  // Try to extract JSON array if there's extra text
  const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    jsonText = jsonMatch[0];
  }

  try {
    return JSON.parse(jsonText);
  } catch (e) {
    console.error('Failed to parse bios JSON:', jsonText);
    throw new Error('Failed to parse Claude response as JSON');
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dinnerId = parseInt(id);

    if (!process.env.DATABASE_PUBLIC_URL && !process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'DATABASE_URL not configured' },
        { status: 500 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      );
    }

    // 1. Fetch dinner with host info
    const dinnerResult = await pool.query<DinnerRow>(`
      SELECT d.id, d.dinner_name, d.dinner_date, d.start_time, d.menu,
        h.address as host_address, h.city as host_city
      FROM dinners d
      LEFT JOIN hosts h ON h.id = d.host_id
      WHERE d.id = $1
    `, [dinnerId]);

    if (dinnerResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Dinner not found' },
        { status: 404 }
      );
    }

    const dinner = dinnerResult.rows[0];

    // 2. Fetch accepted guests with profile data
    const guestsResult = await pool.query<GuestRow>(`
      SELECT g.id, g.first_name, g.last_name, g.phone,
        g.what_do_you_do, g.about, g.one_thing, g.curious_about,
        g.surprising_knowledge, g.social_summary,
        t.summarized_transcript
      FROM invitations i
      JOIN guests g ON g.id = i.guest_id
      LEFT JOIN transcripts t ON t.guest_id = g.id
      WHERE i.dinner_id = $1 AND i.response = 'Accepted'
    `, [dinnerId]);

    if (guestsResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'No accepted guests for this dinner' },
        { status: 400 }
      );
    }

    const guests = guestsResult.rows;

    // 3. Fetch bring item claims
    const claimsResult = await pool.query<BringItemClaimRow>(`
      SELECT bc.guest_id, bi.category, bi.description
      FROM bring_item_claims bc
      JOIN bring_items bi ON bi.id = bc.bring_item_id
      WHERE bi.dinner_id = $1
    `, [dinnerId]);

    const claimsByGuest = new Map<number, string>();
    for (const claim of claimsResult.rows) {
      const item = claim.description
        ? `${claim.category} (${claim.description})`
        : claim.category;
      claimsByGuest.set(claim.guest_id, item);
    }

    // 4. Build guest profiles for Claude
    const profiles: GuestProfile[] = guests.map(guest => ({
      guestId: guest.id,
      firstName: guest.first_name,
      profileText: buildGuestProfile(guest),
    }));

    // 5. Call Claude to generate bios
    const bios = await generateBiosWithClaude(profiles);
    const biosByGuest = new Map<number, string>();
    for (const bio of bios) {
      biosByGuest.set(bio.guestId, bio.bio);
    }

    // 6. Format date/time
    // Handle dinner_date as either Date object or string from PostgreSQL
    console.log('dinner.dinner_date raw:', dinner.dinner_date, 'type:', typeof dinner.dinner_date);

    let date: Date;
    if (dinner.dinner_date instanceof Date) {
      // PostgreSQL Date - use the date parts directly to avoid timezone shifts
      date = new Date(
        dinner.dinner_date.getFullYear(),
        dinner.dinner_date.getMonth(),
        dinner.dinner_date.getDate(),
        12, 0, 0
      );
    } else if (typeof dinner.dinner_date === 'string') {
      // String format - extract YYYY-MM-DD part
      const match = dinner.dinner_date.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        date = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]), 12, 0, 0);
      } else {
        // Fallback: try parsing directly
        date = new Date(dinner.dinner_date);
      }
    } else {
      // Fallback for any other type
      date = new Date(dinner.dinner_date);
    }

    console.log('Parsed date:', date, 'isValid:', !isNaN(date.getTime()));

    const fullDate = format(date, 'EEEE, MMMM d');
    const dayOfWeek = format(date, 'EEEE');
    const time = formatTime(dinner.start_time);

    // Build address
    const address = [dinner.host_address, dinner.host_city]
      .filter(Boolean)
      .join(', ') || 'TBD';

    // 7. Compose reminder per guest
    const reminders: GuestReminder[] = guests.map(guest => {
      const bringItem = claimsByGuest.get(guest.id) || null;
      const bringLine = bringItem
        ? `You signed up to bring: ${bringItem}`
        : 'Please bring a bottle of wine, an app, or a dessert to share';

      // Build other guests' bios (exclude this guest)
      const otherBios = guests
        .filter(g => g.id !== guest.id)
        .map(g => {
          const bio = biosByGuest.get(g.id) || 'An interesting dinner companion';
          return `${g.first_name} - ${bio}`;
        })
        .join('\n');

      const message = `Hey ${guest.first_name}! Quick reminder, Con-Vive dinner is tomorrow night, ${fullDate} at ${time}.

📍 ${address}
🍽️ ${dinner.menu || 'Menu TBD'}
🍷 ${bringLine}

Here's a little about who you'll be dining with:

${otherBios}

See you ${dayOfWeek}! - Joe`;

      return {
        guestId: guest.id,
        guestName: `${guest.first_name} ${guest.last_name}`,
        firstName: guest.first_name,
        phone: guest.phone,
        bringItem,
        message,
      };
    });

    // 8. Return response
    const response: ReminderResponse = {
      dinnerId,
      dinnerName: dinner.dinner_name,
      dinnerDate: fullDate,
      reminders,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error generating reminders:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate reminders' },
      { status: 500 }
    );
  }
}
