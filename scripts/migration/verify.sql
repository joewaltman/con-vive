-- Con-Vive: Migration Verification Queries
-- Run these after migration to validate data

-- ============================================
-- BASIC COUNTS
-- ============================================

-- Total guest count (expect ~292)
SELECT 'Total guests' as metric, count(*) as value FROM guests;

-- Total transcripts
SELECT 'Total transcripts' as metric, count(*) as value FROM transcripts;

-- Total dinners
SELECT 'Total dinners' as metric, count(*) as value FROM dinners;

-- Total invitations
SELECT 'Total invitations' as metric, count(*) as value FROM invitations;

-- Unmatched invitations (guest_id is NULL)
SELECT 'Unmatched invitations' as metric, count(*) as value
FROM invitations WHERE guest_id IS NULL;

-- ============================================
-- SAMPLE QUERIES
-- ============================================

-- Guests available Wed, no red meat, priority 2, not invited
SELECT first_name, last_name, phone, dietary_notes
FROM guests
WHERE 'Wed' = ANY(available_days)
  AND 'No Red Meat' = ANY(dietary_restrictions)
  AND priority = 2
  AND funnel_stage NOT IN ('Invited', 'Attended');

-- Call complete but no dinner yet
SELECT first_name, last_name, phone, curiosity_score, spark_score
FROM guests
WHERE call_complete = true
  AND funnel_stage = 'Call Done'
ORDER BY spark_score DESC NULLS LAST
LIMIT 10;

-- Transcript for specific guest (example: Jacobson)
SELECT g.first_name, g.last_name,
       LEFT(t.summarized_transcript, 200) as transcript_preview
FROM guests g
JOIN transcripts t ON t.guest_id = g.id
WHERE g.last_name = 'Jacobson';

-- March 23 dinner attendees
SELECT g.first_name, g.last_name, i.response, d.dinner_name
FROM invitations i
LEFT JOIN guests g ON g.id = i.guest_id
LEFT JOIN dinners d ON d.id = i.dinner_id
WHERE d.dinner_name ILIKE '%mar23%' OR d.dinner_date = '2025-03-23';

-- ============================================
-- DATA QUALITY CHECKS
-- ============================================

-- Guests with transcripts
SELECT 'Guests with transcripts' as metric, count(DISTINCT guest_id) as value
FROM transcripts;

-- Guests by funnel stage
SELECT funnel_stage, count(*) as count
FROM guests
GROUP BY funnel_stage
ORDER BY count DESC;

-- Guests by priority
SELECT priority, count(*) as count
FROM guests
WHERE priority IS NOT NULL
GROUP BY priority
ORDER BY priority;

-- Invitations by response
SELECT response, count(*) as count
FROM invitations
GROUP BY response
ORDER BY count DESC;
