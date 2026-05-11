UPDATE djs 
SET location = 'Siantar, Indonesia', 
    bio = REPLACE(bio, 'Medan', 'Siantar'), 
    upcoming = REPLACE(upcoming, 'Medan', 'Siantar'), 
    recent_tracks = ARRAY['Miracle (Rangga Zenico & DJ Ndrow Bootleg)'] 
WHERE stage_name = 'DJ NDROW';
