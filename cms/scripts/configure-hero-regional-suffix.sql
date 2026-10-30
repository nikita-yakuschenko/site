-- Content-only, idempotent update. The previous continuation stays intact.
BEGIN;
SELECT id FROM blocks WHERE key = 'hero' FOR UPDATE;
UPDATE blocks_parts SET _order = _order + 1
WHERE _parent_id = (SELECT id FROM blocks WHERE key = 'hero') AND _order > 2
  AND NOT EXISTS (SELECT 1 FROM blocks_parts p JOIN blocks b ON b.id=p._parent_id WHERE b.key='hero' AND p.key='hero.regionalSuffix');
INSERT INTO blocks_parts (_order, _parent_id, id, key, title, text, text_more, action)
SELECT 3, id, substr(replace(gen_random_uuid()::text,'-',''),1,24), 'hero.regionalSuffix', 'Региональная приставка', 'в Нижнем Новгороде и области', 'в Москве и Московской области', 'form'
FROM blocks b WHERE b.key='hero' AND NOT EXISTS (SELECT 1 FROM blocks_parts p WHERE p._parent_id=b.id AND p.key='hero.regionalSuffix');
UPDATE blocks SET updated_at=now() WHERE key='hero';
SELECT p.key,p.title,p.text,p.text_more FROM blocks_parts p JOIN blocks b ON b.id=p._parent_id WHERE b.key='hero' AND p.key IN ('hero.heading','hero.regionalSuffix') ORDER BY p._order;
COMMIT;
