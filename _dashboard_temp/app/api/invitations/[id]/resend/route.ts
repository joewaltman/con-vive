import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/pool';
import { sendEmail } from '@/lib/email';
import InviteEmail from '@/emails/InviteEmail';
import { format } from 'date-fns';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch invitation with guest and dinner details
    const result = await pool.query(`
      SELECT
        i.*,
        g.first_name as guest_first_name,
        g.email as guest_email,
        d.dinner_date,
        d.start_time,
        d.menu,
        d.vibe_descriptor,
        d.price_cents,
        d.host_guest_id,
        h.first_name as host_first_name
      FROM invitations i
      JOIN guests g ON g.id = i.guest_id
      JOIN dinners d ON d.id = i.dinner_id
      LEFT JOIN guests h ON h.id = d.host_guest_id
      WHERE i.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    const invitation = result.rows[0];

    if (!invitation.guest_email) {
      return NextResponse.json(
        { error: 'Guest has no email address' },
        { status: 400 }
      );
    }

    if (!invitation.token) {
      return NextResponse.json(
        { error: 'Invitation has no token' },
        { status: 400 }
      );
    }

    // Format dinner details
    const dinnerDate = new Date(invitation.dinner_date + 'T00:00:00');
    const formattedDate = format(dinnerDate, 'EEEE, MMMM do');
    const formattedTime = invitation.start_time
      ? format(new Date(`2000-01-01T${invitation.start_time}`), 'h:mm a')
      : '6:00 PM';
    const priceDollars = (invitation.price_cents || 4000) / 100;
    const websiteBaseUrl = process.env.WEBSITE_BASE_URL || 'https://con-vive.com';
    const bookingLink = `${websiteBaseUrl}/d/${invitation.token}`;

    // Send email
    const emailResult = await sendEmail({
      to: invitation.guest_email,
      subject: `Reminder: You're invited to a Con-Vive dinner on ${formattedDate}`,
      react: InviteEmail({
        guestFirstName: invitation.guest_first_name || 'Friend',
        dinnerDate: formattedDate,
        dinnerTime: formattedTime,
        hostFirstName: invitation.host_first_name || 'Your Host',
        menu: invitation.menu || 'A delicious dinner prepared with care',
        vibeDescriptor: invitation.vibe_descriptor,
        priceDollars,
        magicLink: bookingLink,
      }),
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { error: emailResult.error || 'Failed to send email' },
        { status: 500 }
      );
    }

    // Update invite_email_sent_at
    await pool.query(`
      UPDATE invitations
      SET invite_email_sent_at = NOW()
      WHERE id = $1
    `, [id]);

    return NextResponse.json({ success: true, emailId: emailResult.id });
  } catch (error) {
    console.error('Error resending invite:', error);
    return NextResponse.json(
      { error: 'Failed to resend invite' },
      { status: 500 }
    );
  }
}
