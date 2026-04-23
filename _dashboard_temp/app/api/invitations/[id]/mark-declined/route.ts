import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/pool';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify invitation exists
    const checkResult = await pool.query(
      'SELECT id, status, response FROM invitations WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Update status to declined
    await pool.query(`
      UPDATE invitations
      SET
        status = 'declined',
        declined_at = NOW(),
        response = 'Declined',
        response_date = CURRENT_DATE
      WHERE id = $1
    `, [id]);

    // Remove attendance record if it existed
    const invitation = checkResult.rows[0];
    if (invitation.status === 'confirmed' || invitation.response === 'Accepted') {
      await pool.query(`
        DELETE FROM attendance
        WHERE guest_id = (SELECT guest_id FROM invitations WHERE id = $1)
          AND dinner_id = (SELECT dinner_id FROM invitations WHERE id = $1)
      `, [id]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking declined:', error);
    return NextResponse.json(
      { error: 'Failed to mark as declined' },
      { status: 500 }
    );
  }
}
