-- Cleanup script for soft-deleted users
-- This script removes users that were marked as deleted (AKTIVEN = 'N')
-- Correct deletion order: EMAIL_VERIFIKACIJA, REVIZIJSKI_DNEVNIK, PONASTAVITEV_GESLA, UPORABNISK_RACUN, STATUS_CLANA, KARTICA_LOJALNOSTI, CLAN

-- Temporary table to store IDs of users to delete
CREATE TEMPORARY TABLE deleted_user_ids AS
SELECT ID_CLANA, ID_RACUNA FROM (
  SELECT c.ID_CLANA, r.ID_RACUNA
  FROM CLAN c
  LEFT JOIN UPORABNISK_RACUN r ON r.ID_CLANA = c.ID_CLANA
  WHERE c.AKTIVEN = 'N'
);

-- Delete email verification records
DELETE FROM EMAIL_VERIFIKACIJA 
WHERE ID_RACUNA IN (SELECT ID_RACUNA FROM deleted_user_ids WHERE ID_RACUNA IS NOT NULL);

-- Delete audit trail for these users
DELETE FROM REVIZIJSKI_DNEVNIK 
WHERE ID_RACUNA IN (SELECT ID_RACUNA FROM deleted_user_ids WHERE ID_RACUNA IS NOT NULL);

-- Delete password reset records
DELETE FROM PONASTAVITEV_GESLA 
WHERE ID_RACUNA IN (SELECT ID_RACUNA FROM deleted_user_ids WHERE ID_RACUNA IS NOT NULL);

-- Delete user accounts
DELETE FROM UPORABNISK_RACUN 
WHERE ID_RACUNA IN (SELECT ID_RACUNA FROM deleted_user_ids WHERE ID_RACUNA IS NOT NULL);

-- Delete status history
DELETE FROM STATUS_CLANA 
WHERE ID_CLANA IN (SELECT ID_CLANA FROM deleted_user_ids);

-- Delete loyalty cards
DELETE FROM KARTICA_LOJALNOSTI 
WHERE ID_CLANA IN (SELECT ID_CLANA FROM deleted_user_ids);

-- Delete members
DELETE FROM CLAN 
WHERE ID_CLANA IN (SELECT ID_CLANA FROM deleted_user_ids);

COMMIT;

-- Output result
SELECT COUNT(*) as deleted_users FROM deleted_user_ids;
