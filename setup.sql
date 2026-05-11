ALTER TABLE profiles DISABLE TRIGGER protect_profile_sensitive_fields_trigger;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS whatsapp text,
ADD COLUMN IF NOT EXISTS instagram text,
ADD COLUMN IF NOT EXISTS bank_account text,
ADD COLUMN IF NOT EXISTS bank_name text;

UPDATE profiles SET role = 'admin', full_name = 'Disba Music Official' WHERE email = 'disbamusic.official@gmail.com';

UPDATE djs SET rank = 2 WHERE stage_name = 'DJ VORTEX';
UPDATE djs SET rank = 3 WHERE stage_name = 'LUNA RAY';
UPDATE djs SET rank = 4 WHERE stage_name = 'NOVA PULSE';
UPDATE djs SET rank = 5 WHERE stage_name = 'ZENITH';

DELETE FROM djs WHERE stage_name = 'DJ NDROW';
INSERT INTO djs (name, stage_name, rank, plays, likes, image, badge, genre, location, bio, recent_tracks, upcoming)
VALUES (
  'DJ Ndrow', 
  'DJ NDROW', 
  1, 
  '150.2k', 
  '15.4k', 
  'https://hwxrxwfrpilxkpdlolph.supabase.co/storage/v1/object/public/rilisan/assets/dj-ndrow.png', 
  'Resident DJ', 
  'House / Remix', 
  'Medan, Indonesia', 
  'DJ Ndrow adalah seorang DJ dan produser musik yang berbasis di Medan, Indonesia, serta merupakan resident DJ di Soedirman Bistro Medan. Ia dikenal melalui rilis lagu/remix di Instagram, TikTok, dan SoundCloud, termasuk karya kolaborasi seperti Miracle (Rangga Zenico & DJ Ndrow Bootleg).', 
  ARRAY['Miracle (Rangga Zenico & DJ Ndrow Bootleg)', 'Soedirman Bistro Mix', 'TikTok Trending Remix'], 
  'Soedirman Bistro Medan - Tonight'
);

ALTER TABLE profiles ENABLE TRIGGER protect_profile_sensitive_fields_trigger;
