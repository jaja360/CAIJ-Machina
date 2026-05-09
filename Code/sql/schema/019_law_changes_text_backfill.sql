-- +goose up
ALTER TABLE law_changes
ADD COLUMN IF NOT EXISTS old_text TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS new_text TEXT NOT NULL DEFAULT '';

UPDATE law_changes AS lc
SET old_text = COALESCE(so.content, ''),
    new_text = COALESCE(sn.content, '')
FROM sublaws AS so,
     sublaws AS sn
WHERE lc.sub_law_id_old = so.id
  AND lc.sub_law_id_new = sn.id
  AND (lc.old_text = '' OR lc.new_text = '');

-- +goose down
ALTER TABLE law_changes
DROP COLUMN IF EXISTS old_text,
DROP COLUMN IF EXISTS new_text;
