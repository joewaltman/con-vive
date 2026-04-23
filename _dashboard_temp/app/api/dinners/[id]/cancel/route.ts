import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/pool';
import { fetchDinner } from '@/lib/dinners';
import { issueRefund } from '@/lib/stripe';
import { sendEmail } from '@/lib/email';
import DinnerCancelledEmail from '@/emails/DinnerCancelledEmail';
import { format } from 'date-fns';

interface CancelResult {
  success: boolean;
  refundsIssued: number;
  refundsFailed: number;
  emailsSent: number;
  emailsFailed: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch dinner details
    const dinner = await fetchDinner(id);

    // Validate dinner can be cancelled
    if (dinner.fields['Status'] === 'cancelled') {
      return NextResponse.json(
        { error: 'Dinner is already cancelled' },
        { status: 400 }
      );
    }

    if (dinner.fields['Status'] === 'completed') {
      return NextResponse.json(
        { error: 'Cannot cancel a completed dinner' },
        { status: 400 }
      );
    }

    const dinnerDate = new Date(dinner.fields['Dinner Date'] + 'T00:00:00');
    const formattedDate = format(dinnerDate, 'EEEE, MMMM do');

    const result: CancelResult = {
      success: true,
      refundsIssued: 0,
      refundsFailed: 0,
      emailsSent: 0,
      emailsFailed: 0,
    };

    // Get all invitations for this dinner
    const invitationsResult = await pool.query(`
      SELECT i.*, g.first_name, g.email
      FROM invitations i
      JOIN guests g ON g.id = i.guest_id
      WHERE i.dinner_id = $1
    `, [id]);

    // Process each invitation
    for (const invitation of invitationsResult.rows) {
      const isConfirmed = invitation.status === 'confirmed' || invitation.response === 'Accepted';

      if (isConfirmed && invitation.payment_intent_id) {
        // Issue refund
        const refundResult = await issueRefund(
          invitation.payment_intent_id,
          invitation.price_paid_cents
        );

        if (refundResult.success) {
          result.refundsIssued++;

          // Update invitation with refund info
          await pool.query(`
            UPDATE invitations
            SET
              status = 'cancelled',
              cancelled_at = NOW(),
              refunded_amount_cents = $1
            WHERE id = $2
          `, [invitation.price_paid_cents, invitation.id]);
        } else {
          result.refundsFailed++;
          console.error(`Refund failed for invitation ${invitation.id}:`, refundResult.error);
        }

        // Send cancellation email
        if (invitation.email) {
          const emailResult = await sendEmail({
            to: invitation.email,
            subject: `Update on your Con-Vive dinner ${formattedDate}`,
            react: DinnerCancelledEmail({
              guestFirstName: invitation.first_name || 'Friend',
              dinnerDate: formattedDate,
              refundAmountDollars: (invitation.price_paid_cents || 0) / 100,
            }),
          });

          if (emailResult.success) {
            result.emailsSent++;
          } else {
            result.emailsFailed++;
          }
        }
      } else if (isConfirmed) {
        // Confirmed but no payment (manual confirmation)
        await pool.query(`
          UPDATE invitations
          SET
            status = 'cancelled',
            cancelled_at = NOW()
          WHERE id = $1
        `, [invitation.id]);

        // Send cancellation email (no refund mentioned)
        if (invitation.email) {
          const emailResult = await sendEmail({
            to: invitation.email,
            subject: `Update on your Con-Vive dinner ${formattedDate}`,
            react: DinnerCancelledEmail({
              guestFirstName: invitation.first_name || 'Friend',
              dinnerDate: formattedDate,
              refundAmountDollars: 0,
            }),
          });

          if (emailResult.success) {
            result.emailsSent++;
          } else {
            result.emailsFailed++;
          }
        }
      } else {
        // Not confirmed (invited, checkout_pending, etc.)
        await pool.query(`
          UPDATE invitations
          SET
            status = 'cancelled',
            cancelled_at = NOW()
          WHERE id = $1
        `, [invitation.id]);
      }
    }

    // Update dinner status
    await pool.query(`
      UPDATE dinners
      SET status = 'cancelled', updated_at = NOW()
      WHERE id = $1
    `, [id]);

    // Remove all attendance records for this dinner
    await pool.query(`
      DELETE FROM attendance WHERE dinner_id = $1
    `, [id]);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error cancelling dinner:', error);
    return NextResponse.json(
      { error: 'Failed to cancel dinner' },
      { status: 500 }
    );
  }
}
