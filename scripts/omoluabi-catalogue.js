(function (global) {
  const BASE_URL = './';

  // Track fields: slug, title, src (audio), artist (optional), shareUrl (internal), sourceUrl (external), coverArt (optional).
  const OMOLUABI_TRACKS = [
    {
      slug: 'is-love-conditional',
      title: 'Is Love Conditional',
      artist: 'Omoluabi Productions',
      src: 'https://cdn1.suno.ai/6c43cb2f-907e-488a-bc6d-cb8e582a189a.mp3',
      shareUrl: '/main.html?album=omoluabi-production-catalogue&track=is-love-conditional',
      sourceUrl: 'https://suno.com/s/MtLgCBp4MeCQcvIu',
      coverArt: 'https://cdn2.suno.ai/image_6c43cb2f-907e-488a-bc6d-cb8e582a189a.jpeg'
    },
    {
      slug: 'ostrich-effect',
      title: 'Ostrich Effect',
      artist: 'Omoluabi Productions',
      src: 'https://cdn1.suno.ai/6447e1d2-2133-450a-aff8-536263dab07f.mp3',
      shareUrl: '/main.html?album=omoluabi-production-catalogue&track=ostrich-effect',
      sourceUrl: 'https://suno.com/s/MV51yVvEiROVD5zb',
      coverArt: 'https://cdn2.suno.ai/image_6447e1d2-2133-450a-aff8-536263dab07f.jpeg'
    },
    { slug: 'priapism', title: 'Priapism', src: 'https://cdn1.suno.ai/d9360744-21e6-4de3-a2ec-a2558d09abfe.mp3' },
    { slug: 'walk-away', title: 'Walk Away', src: 'https://cdn1.suno.ai/3fa09300-e923-40d8-a764-b2e48f5b1668.mp3' },
    { slug: 'flow-no-be-by-force', title: 'Flow No Be By Force', src: 'https://cdn1.suno.ai/33a016db-2740-4021-85a5-98ede3ac79fb.mp3' },
    { slug: 'ling-zing', title: 'Ling Zing', src: 'https://cdn1.suno.ai/89b35923-5ce0-4464-9c68-931f06de6f69.mp3' },
    { slug: 'atmosphere-status', title: 'Atmosphere Status', src: 'https://cdn1.suno.ai/2eee0551-4301-49df-b433-f58cacc9150a.mp3' },
    { slug: 'branama', title: 'Branama', src: 'https://cdn1.suno.ai/efdd1bda-f329-4cab-8183-3dadadb45ccc.mp3', releaseYear: 2026 },
    { slug: 'alafia', title: 'Alafia', src: 'https://cdn1.suno.ai/bd9f428d-77d2-4aee-b797-9c0d4913ebf4.mp3' },
    { slug: 'no-respect-no-me', title: 'No Respect, No Me', src: 'https://cdn1.suno.ai/692a7001-fadd-4e70-8727-07a168e4c8b5.mp3' },
    {
      slug: 'make-we-no-meet-who-we-suppose-be-mwnmwwsb',
      title: 'Make We No Meet Who We Suppose Be (MWNMWWSB)',
      src: 'https://cdn1.suno.ai/6297e776-d21e-4841-b625-0486d81ecfc8.mp3'
    },
    { slug: 'government-why-ft-steady', title: 'Government Why ft. Steady', src: 'https://cdn1.suno.ai/d4891669-f5e2-403a-826c-0d886d5e0f5e.mp3' },
    { slug: 'naughty-boy-ft-steady', title: 'Naughty Boy ft. Steady', src: 'https://cdn1.suno.ai/5eb479d0-4e75-431e-9bb4-21aef77e7dd3.mp3' },
    { slug: 'mummy-i-love-you-ft-steady', title: 'Mummy I love you ft. Steady', src: 'https://cdn1.suno.ai/e8ab9c5b-b567-4e5e-8b26-4c33faff4307.mp3' },
    { slug: 'udo-don-cost', title: 'Udo Don Cost', src: 'https://cdn1.suno.ai/8d4e57ee-c330-495e-a9d0-75a861a4420f.mp3' },
    { slug: 'matasa-ku-tashi', title: 'Matasa Ku Tashi', src: 'https://cdn1.suno.ai/377a7311-7338-4a51-816a-96eacaef7bac.mp3' },
    { slug: 'feelings-fi-you-ft-steady', title: 'Feelings Fi You ft. Steady', src: 'https://cdn1.suno.ai/1dcdb3cf-5397-41d0-b005-f79055bf5a56.mp3' },
    { slug: 'i-love-you', title: 'I Love You', src: 'https://cdn1.suno.ai/ab702e5a-f698-4e05-9463-499cbeccff67.mp3' },
    { slug: 'face-of-a-narcissist', title: 'Face Of A Narcissist', src: 'https://cdn1.suno.ai/4a173806-00d5-4528-be27-3f236df02c58.mp3' },
    { slug: 'growth-comes-with-goodbyes', title: 'Growth Comes With Goodbyes', src: 'https://cdn1.suno.ai/52e7e84c-205b-4439-9c59-7e21304ca168.mp3' },
    { slug: 'boda-yen', title: 'Boda Yen', src: 'https://cdn1.suno.ai/e75f0166-5134-4538-b33d-4bbdf708e53e.mp3' },
    { slug: 'different-phases', title: 'Different Phases', src: 'https://cdn1.suno.ai/55a69d8b-c572-4280-84df-6226f574e92e.mp3' },
    { slug: 'built-like-this', title: 'Built Like This', src: 'https://cdn1.suno.ai/383f1d83-84da-492d-9716-a09608fdeba4.mp3' },
    { slug: 'one-position', title: 'One Position', src: 'https://cdn1.suno.ai/97301c6c-bcad-411b-adce-02b9cfd071d8.mp3' },
    { slug: 'perform-my-life-no-more', title: 'Perform My Life No More', src: 'https://cdn1.suno.ai/fb22a6b0-5bb8-49eb-b77c-529a9e170817.mp3' },
    { slug: 'when-help-rode-in-from-nowhere', title: 'When Help Rode In From Nowhere', src: 'https://cdn1.suno.ai/4423f194-f2b3-4aea-ae4d-ed9150de2477.mp3' },
    { slug: 'freedom', title: 'Freedom', src: 'https://cdn1.suno.ai/312ec841-e3db-4cf4-9cf0-5a581e02322d.mp3' },
    { slug: 'home-becomes-peace', title: 'Home Becomes Peace', src: 'https://cdn1.suno.ai/5ef5743f-4848-4d92-84c6-873d9b51958e.mp3' },
    { slug: 'pepper-4-body', title: 'Pepper 4 Body', src: 'https://cdn1.suno.ai/5262fb23-fc38-404e-932b-e95de36effa8.mp3' },
    { slug: 'dad-is-missing', title: 'Dad is Missing', src: 'https://cdn1.suno.ai/7a8b0fa8-fb18-4af8-9007-c2b54e2daa0b.mp3' },
    { slug: 'comfort-zone', title: 'Comfort Zone', src: 'https://cdn1.suno.ai/5baa29da-81ce-4f7d-94cc-3b15e88055f5.mp3' },
    { slug: 'detty-season', title: 'Detty Season', src: 'https://cdn1.suno.ai/b618aae7-c7b0-4260-af4a-2f7d2e5e3b70.mp3' },
    { slug: 'detty-december', title: 'Detty December', src: 'https://cdn1.suno.ai/204380c2-034e-441b-8bf3-ef4e361554c0.mp3' },
    { slug: 'persecutory-paranoia', title: 'Persecutory Paranoia', src: 'https://cdn1.suno.ai/8e63cdab-2e25-4993-ad25-1d074224b0c2.mp3' },
    { slug: 'famine-of-fathers', title: 'Famine Of Fathers', src: 'https://cdn1.suno.ai/22d01aa2-02bb-4c6a-917c-0cd1b1d28552.mp3' },
    { slug: 'guilt-trip-trap', title: 'Guilt Trip Trap', src: 'https://cdn1.suno.ai/f0666a04-fab8-4c4f-bb75-56147c49feaa.mp3' },
    { slug: 'watchman', title: 'Watchman', src: 'https://cdn1.suno.ai/5c17dd10-1770-467a-947a-db773c72ec78.mp3' },
    { slug: 'omoluabi', title: 'Ọmọlúàbí', src: 'https://cdn1.suno.ai/fb1daddf-1de4-4164-bb9d-113f9639d732.mp3' },
    { slug: 'take-the-risk', title: 'Take The Risk', src: 'https://cdn1.suno.ai/d3ec2b0a-6062-417f-a62c-4d746f7f4f57.mp3' },
    { slug: 'woman-who-hates-correction', title: 'Woman who Hates Correction', src: 'https://cdn1.suno.ai/d14755f5-381a-42c2-9cec-5a539d2937bf.mp3' },
    { slug: 'home-that-looks-safe', title: 'Home That Looks Safe', src: 'https://cdn1.suno.ai/08a939af-4823-4054-bef6-1b8420857d9c.mp3' },
    { slug: 'tiktok', title: 'TikTok', src: 'https://cdn1.suno.ai/d5669af3-5caf-49e2-aca4-47fbc73a6d25.mp3' },
    { slug: 'something-is-about-to-happen', title: 'Something Is About To Happen', src: 'https://cdn1.suno.ai/800b9280-4389-47f6-b20d-6aa7dd3298ad.mp3' },
    { slug: 'haters', title: 'Haters', src: 'https://cdn1.suno.ai/160aa857-a65f-4f60-9217-6045b2091183.mp3' },
    { slug: 'does-it-matter-to-matter', title: 'Does It Matter To Matter', src: 'https://cdn1.suno.ai/c6e3b4e8-964c-48dc-8187-3005865cb00a.mp3' },
    { slug: 'pastor-or-hustler', title: 'Pastor or Hustler', src: 'https://cdn1.suno.ai/a5a8c49a-6871-40b6-9054-36c81ed8be90.mp3' },
    { slug: 'fore-runners-map', title: 'Fore-runner’s Map', src: 'https://cdn1.suno.ai/7356371a-b8f7-470a-87a3-dbe5c2916f72.mp3' },
    { slug: 'no-look-down', title: 'No Look Down', src: 'https://cdn1.suno.ai/5ad4f8bc-4cef-4ad4-b847-c4f1b8147445.mp3' },
    { slug: 'wonders-breeze', title: "Wonder's Breeze", src: 'https://cdn1.suno.ai/4f81332a-d833-4dc9-9763-7db0dfde3610.mp3' },
    { slug: 'covenant-of-isolation', title: 'Covenant Of Isolation', src: 'https://cdn1.suno.ai/7578528b-34c1-492c-9e97-df93216f0cc2.mp3' },
    { slug: 'ghostwriter', title: 'Ghostwriter', src: 'https://cdn1.suno.ai/57a24cc6-ab05-447a-91ab-008321e9fc6a.mp3' },
    { slug: 'she-said-no-franca-viola-story', title: 'She Said No (Franca Viola Story)', src: 'https://cdn1.suno.ai/b8a32f06-edd8-475f-9e06-7f54fc84d571.mp3' },
    { slug: 'a-wa-good-gan', title: 'A Wa Good Gan', src: 'https://cdn1.suno.ai/c84b1a3e-b364-41d3-be5f-8e3b2273eb96.mp3' },
    { slug: 'stir-am-well', title: 'Stir Am Well', src: 'https://cdn1.suno.ai/ce45202a-56e3-4d86-b185-3aa741aac131.mp3' },
    { slug: 'talk-wey-bend-obfuscation', title: 'Talk Wey Bend (Obfuscation)', src: 'https://cdn1.suno.ai/d58c70e0-b330-4cda-8ee5-afd65f874d39.mp3' },
    { slug: 'belong-wahala', title: 'Belong Wahala', src: 'https://cdn1.suno.ai/dbb44f28-64a1-49bb-bcbf-b5460c29ccd4.mp3' },
    { slug: 'habatically', title: 'Habatically', src: 'https://cdn1.suno.ai/19c15d58-c776-4f1c-9ef7-3bb7890b26bb.mp3' },
    { slug: 'party-no-go-stop-instrumental', title: 'Party No Go Stop (Instrumental)', src: 'https://cdn1.suno.ai/c6bb53b4-def2-4a68-bfaf-35f7f6dd7810.mp3' },
    { slug: 'blood-on-the-lithium', title: 'Blood On The Lithium', src: `${BASE_URL}Blood%20On%20The%20Lithium.mp3` },
    { slug: 'no-be-my-story', title: 'No Be My Story', src: `${BASE_URL}No%20Be%20My%20Story.mp3` },
    { slug: 'na-we-dey', title: 'Na We Dey', src: `${BASE_URL}Na%20We%20Dey.mp3` },
    { slug: 'as-far-as-your-mind-can-see', title: 'As Far As Your Mind Can See', src: 'https://cdn1.suno.ai/53a2cbb3-7a29-4641-aca3-43ad0a1d8ae1.mp3' },
    { slug: 'the-distance', title: 'The Distance', src: 'https://cdn1.suno.ai/e70059ca-398f-481e-9a71-6338fcfb9a1d.mp3' },
    { slug: 'stand-with-truth', title: 'Stand With Truth', src: 'https://cdn1.suno.ai/ab26a763-cba1-4426-9bf0-8117d0602684.mp3' },
    { slug: 'tears-of-love', title: 'Tears Of Love', src: 'https://cdn1.suno.ai/017e178e-3478-485f-b844-aa72b327e2a6.mp3' },
    { slug: 'raising-boys', title: 'Raising Boys', src: 'https://cdn1.suno.ai/c48de9b1-a68b-4889-b43b-243da2d54bc0.mp3' },
    { slug: 'destiny-no-dey-wait', title: 'Destiny No Dey Wait', src: 'https://cdn1.suno.ai/f7f72dd2-12cd-4568-b831-f745973fa063.mp3' },
    { slug: 'pass-the-baton', title: 'Pass The Baton', src: 'https://cdn1.suno.ai/471dc968-d463-435c-8c3d-85f0d4556d8f.mp3' },
    { slug: 'moores-law', title: 'Moore’s Law', src: 'https://cdn1.suno.ai/891af5b2-b1fe-4db2-9c99-e1b1a15697a2.mp3' },
    { slug: 'her-daughters-father', title: "Her Daughter's Father", src: 'https://cdn1.suno.ai/b35932ed-2188-4780-a919-f5327317915b.mp3' },
    { slug: 'same-ni', title: 'Same Ni', src: 'https://cdn1.suno.ai/473edd61-d1ba-4bad-8014-7302cd1a9b71.mp3' },
    { slug: 'envy', title: 'Envy', src: 'https://cdn1.suno.ai/553eefd4-54ba-4b73-ba02-4df85bfb5bb0.mp3' },
    { slug: 'echoes-of-ice', title: 'Echoes Of Ice', src: 'https://cdn1.suno.ai/6af3b681-f3e6-4e84-85c7-9a2ad5f14e44.mp3' },
    { slug: 'wisdom-moves', title: 'Wisdom Moves', src: 'https://cdn1.suno.ai/e9562054-31e2-4195-ab30-cbe2902193f8.mp3' },
    { slug: 'bread-crumb-effect', title: 'Bread Crumb Effect', src: 'https://cdn1.suno.ai/81ba8cdd-bf24-492c-9504-b52b0a93fb39.mp3' },
    { slug: 'love-without-empathy', title: 'Love Without Empathy', src: 'https://cdn1.suno.ai/df20133e-8c32-48ec-b7d7-969aefef3478.mp3' },
    { slug: 'normal-no-mean-not-toxic', title: 'Normal No Mean NOT Toxic', src: 'https://cdn1.suno.ai/9ce53c0b-5bb2-4ac7-aee7-050013396548.mp3' },
    { slug: 'no-contact', title: 'No Contact', src: 'https://cdn1.suno.ai/d010f7ec-5367-4d82-8243-8a515fcaf961.mp3' },
    { slug: 'shadows-teach-the-light', title: 'Shadows Teach The Light', src: 'https://cdn1.suno.ai/8961b5ef-ca9b-4d0b-bce5-1bf065915db9.mp3' },
    { slug: 'midnight-maybe', title: 'Midnight Maybe', src: 'https://cdn1.suno.ai/f76cf242-e031-4785-a4b5-209b615da414.mp3' },
    { slug: 'run-di-settings', title: 'Run Di Settings', src: 'https://cdn1.suno.ai/db52c7ad-c0aa-4f69-ab66-c7a6740ff1e5.mp3' }
  ];

  const LATEST_ANNOUNCEMENTS = [
    { albumName: 'Omoluabi Production Catalogue', slug: 'is-love-conditional', addedOn: '2026-02-01T09:10:00Z', isFreshDrop: true },
    { albumName: 'Omoluabi Production Catalogue', slug: 'ostrich-effect', addedOn: '2026-02-01T09:05:00Z', isFreshDrop: true },
    { albumName: 'Omoluabi Production Catalogue', slug: 'flow-no-be-by-force', addedOn: '2026-01-20T23:19:09Z', isFreshDrop: true },
    { albumName: 'Omoluabi Production Catalogue', slug: 'priapism', addedOn: '2026-01-13T23:00:00Z', isFreshDrop: true },
    { albumName: 'Omoluabi Production Catalogue', slug: 'walk-away', addedOn: '2026-01-13T23:00:00Z', isFreshDrop: true },
    { albumName: 'Omoluabi Production Catalogue', slug: 'branama', addedOn: '2026-01-10T15:04:57.170Z', isFreshDrop: true },
    { albumName: 'Omoluabi Production Catalogue', slug: 'atmosphere-status', addedOn: '2026-01-04T21:49:18Z', isFreshDrop: true },
    { albumName: 'Omoluabi Production Catalogue', slug: 'ling-zing', addedOn: '2025-12-24T04:00:00Z', isFreshDrop: true },
    { albumName: 'Omoluabi Production Catalogue', slug: 'alafia', addedOn: '2025-12-13T09:20:00Z', isFreshDrop: true },
    { albumName: 'Omoluabi Production Catalogue', slug: 'no-respect-no-me', addedOn: '2025-12-13T09:15:00Z', isFreshDrop: true },
    { albumName: 'Omoluabi Production Catalogue', slug: 'government-why-ft-steady', addedOn: '2025-12-13T09:10:00Z', isFreshDrop: true },
    { albumName: 'Omoluabi Production Catalogue', slug: 'naughty-boy-ft-steady', addedOn: '2025-12-13T09:05:00Z', isFreshDrop: true },
    { albumName: 'Omoluabi Production Catalogue', slug: 'make-we-no-meet-who-we-suppose-be-mwnmwwsb', addedOn: '2025-12-12T09:30:00Z', isFreshDrop: true },
    { albumName: 'Omoluabi Production Catalogue', slug: 'dad-is-missing', addedOn: '2025-11-23T09:00:00Z' },
    { albumName: 'Omoluabi Production Catalogue', slug: 'built-like-this', addedOn: '2025-11-22T09:00:00Z' },
    { albumName: 'Omoluabi Production Catalogue', slug: 'one-position', addedOn: '2025-05-06T09:00:00Z' },
    { albumName: 'Omoluabi Production Catalogue', slug: 'when-help-rode-in-from-nowhere', addedOn: '2025-11-21T09:00:00Z' },
    { albumName: 'Omoluabi Production Catalogue', slug: 'freedom', addedOn: '2025-11-21T09:00:00Z' },
    { albumName: 'Omoluabi Production Catalogue', slug: 'home-becomes-peace', addedOn: '2025-11-18T09:00:00Z' },
    { albumName: 'Omoluabi Production Catalogue', slug: 'no-contact', addedOn: '2025-11-17T09:00:00Z' },
    { albumName: 'Omoluabi Production Catalogue', slug: 'as-far-as-your-mind-can-see', addedOn: '2024-12-13T09:00:00Z' },
    { albumName: 'Omoluabi Production Catalogue', slug: 'normal-no-mean-not-toxic', addedOn: '2025-11-14T09:00:00Z' },
    { albumName: 'Omoluabi Production Catalogue', slug: 'detty-december', addedOn: '2025-11-10T09:00:00Z' },
    { albumName: 'Omoluabi Production Catalogue', slug: 'detty-season', addedOn: '2025-11-07T09:00:00Z' },
    { albumName: 'Omoluabi Production Catalogue', slug: 'pepper-4-body', addedOn: '2024-05-01T09:00:00Z' },
    { albumName: 'Omoluabi Production Catalogue', slug: 'dad-is-missing', addedOn: '2024-04-15T00:00:00Z' },
    { albumName: 'Omoluabi Production Catalogue', slug: 'comfort-zone', addedOn: '2024-11-02T09:00:00Z' },
    { albumName: 'Omoluabi Production Catalogue', slug: 'guilt-trip-trap', addedOn: '2024-09-05T09:00:00Z' },
    { albumName: 'Omoluabi Production Catalogue', slug: 'famine-of-fathers', addedOn: '2024-08-27T09:00:00Z' },
    { albumName: 'Omoluabi Production Catalogue', slug: 'persecutory-paranoia', addedOn: '2024-08-24T09:00:00Z' },
    { albumName: 'Omoluabi Production Catalogue', slug: 'she-said-no-franca-viola-story', addedOn: '2024-08-21T09:00:00Z' },
    { albumName: 'Omoluabi Production Catalogue', slug: 'woman-who-hates-correction', addedOn: '2024-06-24' },
    { albumName: 'Omoluabi Production Catalogue', slug: 'love-without-empathy', addedOn: '2024-05-17', isFreshDrop: true },
    { albumName: 'Omoluabi Production Catalogue', slug: 'bread-crumb-effect', addedOn: '2024-05-09' },
    { albumName: 'Omoluabi Production Catalogue', slug: 'home-that-looks-safe', addedOn: '2024-05-06' }
  ];

  const releaseYearBySlug = new Map();
  LATEST_ANNOUNCEMENTS.forEach(announcement => {
    const parsed = Date.parse(announcement.addedOn);
    if (!Number.isNaN(parsed)) {
      releaseYearBySlug.set(announcement.slug, new Date(parsed).getUTCFullYear());
    }
  });

  OMOLUABI_TRACKS.forEach(track => {
    if (!track) return;
    const knownYear = track.releaseYear ?? releaseYearBySlug.get(track.slug) ?? null;
    track.releaseYear = knownYear;
  });

  const trackBySlug = OMOLUABI_TRACKS.reduce((map, track) => {
    map[track.slug] = track;
    return map;
  }, {});

  const trackByTitle = OMOLUABI_TRACKS.reduce((map, track) => {
    map[track.title] = track;
    return map;
  }, {});

  function resolveAnnouncementTrack(announcement) {
    if (!announcement || !announcement.albumName) return null;
    const track = trackBySlug[announcement.slug] || trackByTitle[announcement.title];
    if (!track) return null;
    return { ...track, albumName: announcement.albumName, isFreshDrop: Boolean(announcement.isFreshDrop) };
  }

  const api = {
    OMOLUABI_TRACKS,
    LATEST_ANNOUNCEMENTS,
    trackBySlug,
    trackByTitle,
    resolveAnnouncementTrack
  };

  global.OmoluabiCatalogue = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
