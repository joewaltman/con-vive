import { NextRequest, NextResponse } from 'next/server';
import { fetchEligibleGuests } from '@/lib/eligibility';
import { fetchDinner } from '@/lib/dinners';
import type { DinnerType } from '@/lib/types';

// Get the day of week abbreviation from a date
function getDayOfWeek(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    // Get dietary restrictions to exclude from query params
    const excludeDietary = searchParams.get('excludeDietary')?.split(',').filter(Boolean) || [];

    // Fetch dinner details
    const dinner = await fetchDinner(id);

    if (!dinner.fields['Dinner Date']) {
      return NextResponse.json(
        { error: 'Dinner date is required' },
        { status: 400 }
      );
    }

    const dinnerDate = dinner.fields['Dinner Date'];
    const dinnerDayOfWeek = getDayOfWeek(dinnerDate);
    const dinnerType = (dinner.fields['Dinner Type'] || 'couples_allowed') as DinnerType;

    const guests = await fetchEligibleGuests({
      dinnerId: id,
      dinnerDate,
      dinnerDayOfWeek,
      dinnerType,
      excludeDietary,
    });

    return NextResponse.json({
      guests,
      dinnerInfo: {
        id,
        name: dinner.fields['Dinner Name'],
        date: dinnerDate,
        dayOfWeek: dinnerDayOfWeek,
        totalSeats: dinner.fields['Total Seats'] || 8,
        minPerGender: dinner.fields['Min Per Gender'] || 2,
        dinnerType,
      },
    });
  } catch (error) {
    console.error('Error fetching eligible guests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch eligible guests' },
      { status: 500 }
    );
  }
}
