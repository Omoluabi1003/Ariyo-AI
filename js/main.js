/* SHARE BUTTON (Web Share API) */
    function shareContent() {
      if (navigator.share) {
        navigator.share({
          title: "Àríyò AI - Smart Naija AI",
          text: "Check out this awesome page!",
          url: window.location.href
        }).catch((err) => console.error("Share failed:", err));
      } else {
        alert("Your browser doesn't support the Web Share API. Please copy the URL manually.");
      }
    }

    /* NAVIGATE TO ABOUT PAGE */
    function navigateToAbout() {
      savePlayerState(); // Save player state before navigation
      window.location.href = 'about.html';
    }

    /* BACKGROUND CYCLER */
    const backgrounds = [
      'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Naija%20AI.jpg',
      'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Naija%20AI2.jpg',
      'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Naija%20AI3.jpg'
    ];
    let currentBgIndex = 0;
    document.body.style.backgroundImage = `url(${backgrounds[currentBgIndex]})`;
    setInterval(() => {
      currentBgIndex = (currentBgIndex + 1) % backgrounds.length;
      document.body.style.backgroundImage = `url(${backgrounds[currentBgIndex]})`;
    }, 30000);

    /* MUSIC PLAYER LOGIC */
    const audioPlayer = new Audio();
    audioPlayer.id = 'audioPlayer';
    audioPlayer.preload = 'auto';
    document.body.appendChild(audioPlayer);
    const albumCover = document.getElementById('albumCover');
    const trackInfo = document.getElementById('trackInfo');
    const trackArtist = document.getElementById('trackArtist');
    const trackYear = document.getElementById('trackYear');
    const trackDuration = document.getElementById('trackDuration');
    const seekBar = document.getElementById('seekBar');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const retryButton = document.getElementById('retryButton');
    const cacheButton = document.getElementById('cacheButton'); // New cache button
    const progressBar = document.getElementById('progressBar').querySelector('div');
    const streakInfo = document.getElementById('streakInfo');
    let shuffleMode = false;
    let isFirstPlay = true;
    let lastTrackSrc = '';
    let lastTrackTitle = '';
    let lastTrackIndex = 0;

    const albums = [
      {
        name: 'Kindness',
        cover: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Kindness%20Cover%20Art.jpg',
        tracks: [
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/A%20Very%20Good%20Bad%20Guy%20v3.mp3', title: 'A Very Good Bad Guy v3' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Dem%20Wan%20Shut%20Me%20Up.mp3', title: 'Dem Wan Shut Me Up' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/EFCC.mp3', title: 'EFCC' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Emergency.mp3', title: 'Emergency' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Film%20Trick%20Election.mp3', title: 'Film Trick Election' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Gbas%20Gbos.mp3', title: 'Gbas Gbos' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Kindness%20(Remastered).mp3', title: 'Kindness (Remastered)' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Locked%20Away.mp3', title: 'Locked Away' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Multi%20choice%20palava.mp3', title: 'Multi choice palava' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Na%20My%20Turn.mp3', title: 'Na My Turn' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Ogoni%20Anthem%20(Remastered).mp3', title: 'Ogoni Anthem (Remastered)' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Ogoni%20Anthem.mp3', title: 'Ogoni Anthem' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Rich%20Pauper.mp3', title: 'Rich Pauper' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Senator%20Natasha’s%20Whisper.mp3', title: 'Senator Natasha’s Whisper' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Sharing%20Formula.mp3', title: 'Sharing Formula' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Show%20Of%20Shame%20v3%20(Remastered).mp3', title: 'Show Of Shame v3 (Remastered)' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Subsidy.mp3', title: 'Subsidy' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Vex%20Money.mp3', title: 'Vex Money' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Working%20on%20myself.mp3', title: 'Working on myself' }
        ]
      },
      {
        name: 'Street Sense',
        cover: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Street_Sense_Album_Cover.jpg',
        tracks: [
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Na%20We%20Dey.mp3', title: 'Na We Dey' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/No%20Be%20My%20Story.mp3', title: 'No Be My Story' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Algorithm%20Of%20Life.mp3', title: 'Algorithm of life' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Babygirl.mp3', title: 'Babygirl' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Ubuntu.mp3', title: 'Ubuntu' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Blood%20On%20The%20Lithium.mp3', title: 'Blood On The Lithium' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Oluwa%20You%20Too%20Good.mp3', title: 'Oluwa You Too Good' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Freedom%20of%20Speech.mp3', title: 'Freedom of Speech' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/E%20Get%20Why.mp3', title: 'E Get Why' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Am%20grateful%20Lord.mp3', title: 'Am grateful Lord' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Game%20Of%20Thrones.mp3', title: 'Game of Thrones' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Give%20and%20Take%20(Reciprocity%20in%20love).mp3', title: 'Give and Take (Reciprocity in love)' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Midas%20Touch.mp3', title: 'Midas Touch' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Naija%20Youth;%20Rise.mp3', title: 'Naija Youth, Rise' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Party%20No%20Go%20Stop.mp3', title: 'Party No Go Stop' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Pigeonhole%20Gbedu.mp3', title: 'Pigeonhole Gbedu' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Queen%20Warrior.mp3', title: 'Queen Warrior' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Holy%20Vibes%20Only.mp3', title: 'Holy Vibes Only' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Sengemenge.mp3', title: 'Sengemenge' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Sowore.mp3', title: 'Sowore' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Street%20Sense.mp3', title: 'Street Sense' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/VDM.mp3', title: 'VDM' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/We%20Are%20Not%20Doing%20That.mp3', title: 'We Are Not Doing That' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Oil%20Money.mp3', title: 'Oil Money' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Gbamsolutely.mp3', title: 'Gbamsolutely' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Mic%20No%20Be%20For%20Waist.mp3', title: 'Mic No Be For Waist' }
        ]
      }
    ];

    const radioStations = [
      { name: "Agidigbo 88.7 FM", location: "Ibadan", url: "https://agidigbostream.com.ng/radio/8000/radio.mp3", logo: "/images/radio_default_logo.jpg" },
      { name: "Nigeria Info FM", location: "Lagos", url: "https://nigeriainfofmlagos993-atunwadigital.streamguys1.com/nigeriainfofmlagos993", logo: "/images/radio_default_logo.jpg" },
      { name: "Radio Lagos FM", location: "Lagos", url: "https://servoserver.com.ng/ekofmradiolagos/stream/2/live.mp3", logo: "/images/radio_default_logo.jpg" },
      { name: "Brilla FM", location: "Lagos", url: "https://ice31.securenetsystems.net/BRILAMP3", logo: "/images/radio_default_logo.jpg" },
      { name: "Vision FM", location: "Kaduna", url: "https://stream-172.zeno.fm/92mxpb1akhruv?zt=eyJhbGciOiJIUzI1NiJ9.eyJzdHJlYW0iOiI5Mm14cGIxYWtocnV2IiwiaG9zdCI6InN0cmVhbS0xNzIuemVuby5fbSIsInJ0dGwiOjUsImp0aSI6ImV5OWlMMlhEU1JLMHNyYnd0b3F4ckEiLCJpYXQiOjE3NDM5MTU4MzgsImV4cCI6MTc0MzkxNTg5OH0.5sHfe_ukTnT2Fdiy83NdYdU0da51JkZXBgFoJVhg8_I", logo: "/images/radio_default_logo.jpg" },
      { name: "Fad FM", location: "Calabar", url: "https://radio.gotright.net/listen/fadfm/radio.mp3", logo: "/images/radio_default_logo.jpg" },
      { name: "JMPBliss Radio", location: "Ibadan", url: "https://stream-173.zeno.fm/ty5h0ecgka0uv?zt=eyJhbGciOiJIUzI1NiJ9.eyJzdHJlYW0iOiJ0eTVoMGVjZ2thMHV2IiwiaG9zdCI6InN0cmVhbS0xNzMuemVuby5mbSIsInJ0dGwiOjUsImp0aSI6InlRa2VIcE9aUV9TT2ZsZDJkWFhLZkEiLCJpYXQiOjE3NDQyMjQ1MjIsImV4cCI6MTc0NDIyNDU4Mn0.NE7xZDe19EjzpWN02xkt9XnorWH8FNdswwHdiih4dUI", logo: "/images/radio_default_logo.jpg" },
      { name: "Wazobia FM", location: "Lagos", url: "https://wazobiafmlagos951-atunwadigital.streamguys1.com/wazobiafmlagos951", logo: "/images/radio_default_logo.jpg" },
      { name: "Magic FM", location: "Aba", url: "https://radio.ifastekpanel.com:1565/stream", logo: "/images/radio_default_logo.jpg" },
      { name: "Inform Me Radio", location: "Nigeria", url: "https://stream-176.zeno.fm/ta1fke6sz1zuv?zt=eyJhbGciOiJIUzI1NiJ9.eyJzdHJlYW0iOiJ0YTFma2U2c3oxenV2IiwiaG9zdCI6InN0cmVhbS0xNzYuemVuby5mbSIsInJ0dGwiOjUsImp0aSI6ImlKY0pKbmZEVHlXOWNyZzJrSHV6X3ciLCJpYXQiOjE3NDQ3Njg5MzQsImV4cCI6MTc0NDc2ODk5NH0.80dAGY0KFczNyEb83ledkuxbeTscZSLM_H9XzWDkiX4", logo: "/images/radio_default_logo.jpg" },
      { name: "Inspiration 92.3 FM", location: "Lagos", url: "https://inspiration923fm-atunwadigital.streamguys1.com/inspiration923fm", logo: "/images/radio_default_logo.jpg" },
      { name: "Splash FM 105.5", location: "Ibadan", url: "http://edge.mixlr.com/channel/cfeki", logo: "/images/radio_default_logo.jpg" },
      { name: "The Beat 99.9 FM", location: "Lagos", url: "http://beatfmlagos.atunwadigital.streamguys1.com/beatfmlagos", logo: "/images/radio_default_logo.jpg" },
      { name: "Fresh 107.9 FM", location: "Abeokuta", url: "https://stream-144.zeno.fm/7gs2681gqeruv?zt=eyJhbGciOiJIUzI1NiJ9.eyJzdHJlYW0iOiI3Z3MyNjgxZ3FlcnV2IiwiaG9zdCI6InN0cmVhbS0xNDQuemVuby5fbSIsInJ0dGwiOjUsImp0aSI6Im5nQmJkeTBjU3QtSlhMeG5QczVMUUEiLCJpYXQiOjE3NDM5MTMxNTksImV4cCI6MTc0MzkxMzIxOX0.bBtX4N1gdSrYDAPnoVAvA_OR42oPE3ceaGueOZW5dkg", logo: "/images/radio_default_logo.jpg" },
      { name: "Faaji 106.5 FM", location: "Lagos", url: "http://streaming.faajifmradio.com:8000/faaji", logo: "/images/radio_default_logo.jpg" },
      { name: "EgbaAlake Radio", location: "Attleboro Falls, USA", url: "https://centova47.instainternet.com/proxy/egbaalak?mp=/stream", logo: "/images/radio_default_logo.jpg" },
      { name: "Ray Power FM", location: "Abuja", url: "https://streamlive2.hearthis.at:8080/9065169.ogg", logo: "/images/radio_default_logo.jpg" },
      { name: "Jay 101.9 FM", location: "Jos", url: "https://stream2.rcast.net/69640/", logo: "/images/radio_default_logo.jpg" },
      { name: "Apostolic Flame Radio", location: "Ibadan", url: "https://hoth.alonhosting.com:1695/stream", logo: "/images/radio_default_logo.jpg" },
      { name: "FRCN Lagos Metro FM", location: "Abuja", url: "http://go.webgateready.com:7668/;", logo: "/images/radio_default_logo.jpg" },
      { name: "Radio Nigeria", location: "Abuja", url: "https://stream.radionigeria.gov.ng/live", logo: "/images/radio_default_logo.jpg" },
      { name: "NBS Solid 97.1 FM", location: "Nassarawa", url: "https://nbsradio1.radioca.st/;", logo: "/images/radio_default_logo.jpg" },
      { name: "Vision Africa Radio", location: "Abia", url: "https://xstreamer.galcom.org:8443/VisionAfrica", logo: "/images/radio_default_logo.jpg" },
      { name: "ITMP Radio", location: "Florida", url: "http://uk4freenew.listen2myradio.com:32739/stream", logo: "/images/radio_default_logo.jpg" },
      { name: "Crest 106.1 FM", location: "Ondo", url: "https://stream-154.zeno.fm/9cgtkwg3teruv?zt=eyJhbGciOiJIUzI1NiJ9.eyJzdHJlYW0iOiI5Y2d0a3dnM3RlcnV2IiwiaG9zdCI6InN0cmVhbS0xNTQuemVuby5fbSIsInJ0dGwiOjUsImp0aSI6IlI4MXQzdjhRUWhDQWdkODRsaWJtckEiLCJpYXQiOjE3NDM5MTI3NzQsImV4cCI6MTc0MzkxMjgzNH0.QiIm090_iZfI55MZu7WqKjm5inX-mmKanKQgGBBbA7w", logo: "/images/radio_default_logo.jpg" },
      { name: "Eko FM", location: "Lagos", url: "https://servoserver.com.ng/ekofmradiolagos/stream/1/live.mp3", logo: "/images/radio_default_logo.jpg" },
      { name: "Liveway Radio Network FM", location: "Lagos", url: "https://stream-173.zeno.fm/qc43ktn6n0quv?zt=eyJhbGciOiJIUzI1NiJ9.eyJzdHJlYW0iOiJxYzQza3RuNm4wcXV2IiwiaG9zdCI6InN0cmVhbS0xNzMuemVuby5fbSIsInJ0dGwiOjUsImp0aSI6ImMtb0ZiQ3dtVE1hZUlEVU5YQ3BiVUEiLCJpYXQiOjE3NDM5MTMyODcsImV4cCI6MTc0MzkxMzM0N30.HVLieksgqvV_vsqRr9_rcDexkz6Lqeqeu7stKvuJr10", logo: "/images/radio_default_logo.jpg" },
      { name: "Radio Space FM", location: "Ibadan", url: "https://stream-175.zeno.fm/79hmhafteg0uv?zt=eyJhbGciOiJIUzI1NiJ9.eyJzdHJlYW0iOiI3OWhtaGFmdGVnMHV2IiwiaG9zdCI6InN0cmVhbS0xNzUuemVuby5fbSIsInJ0dGwiOjUsImp0aSI6IkFqako3a0doUllPcVB1cmY3RDJmN2ciLCJpYXQiOjE3NDM5MTM0NzUsImV4cCI6MTc0MzkxMzUzNX0.Ow_YytmLcyURU6d_ji4EvQ-4YuLvJjXATerfWMHO67o", logo: "/images/radio_default_logo.jpg" },
      { name: "Comfort 95.1 FM", location: "Uyo", url: "https://a3.asurahosting.com:7770/radio.mp3", logo: "/images/radio_default_logo.jpg" },
      { name: "AKBC Akwa Ibom Radio", location: "Uyo", url: "https://stream-175.zeno.fm/2ttc8yl6giztv?zt=eyJhbGciOiJIUzI1NiJ9.eyJzdHJlYW0iOiIydHRjOHlsNmdpenR2IiwiaG9zdCI6InN0cmVhbS0xNzUuemVuby5fbSIsInJ0dGwiOjUsImp0aSI6IlE5VFpTRXpOUzFTMVlHSHdxaW5sQWciLCJpYXQiOjE3NDM5MTM3NjgsImV4cCI6MTc0MzkxMzgyOH0.9X5nRAtcN_4Pv-z5uE6ukYrNEIcwW0gHTVuYUlxVCj4", logo: "/images/radio_default_logo.jpg" },
      { name: "Amen Radio", location: "Lagos", url: "https://eu3.fastcast4u.com/proxy/amenradi?mp=/stream", logo: "/images/radio_default_logo.jpg" },
      { name: "Apala Radio", location: "Ibadan", url: "https://stream-172.zeno.fm/fqcszwwxra0uv?zt=eyJhbGciOiJIUzI1NiJ9.eyJzdHJlYW0iOiJmcWNzend3eHJhMHV2IiwiaG9zdCI6InN0cmVhbS0xNzIuemVuby5mbSIsInJ0dGwiOjUsImp0aSI6IjMtaGJNc2Z6UU82U1VKWlNHbExkcFEiLCJpYXQiOjE3NDQyMjUzMDYsImV4cCI6MTc0NDIyNTM2Nn0.wncuUShs9-mnbAj3ndGGS9qd1z6AHtBzJEgT9b7NZDY", logo: "/images/radio_default_logo.jpg" },
      { name: "WFM 91.77 Women Radio", location: "Lagos", url: "https://s28.myradiostream.com:11618/listen.mp3", logo: "/images/radio_default_logo.jpg" },
      { name: "RFI Haoussa", location: "Nigeria", url: "https://rfihaoussa96k.ice.infomaniak.ch/rfihaoussa-96k.mp3", logo: "/images/radio_default_logo.jpg" },
      { name: "Tungba FM", location: "Lagos", url: "https://stream-173.zeno.fm/3vd633m7ctzuv?zt=eyJhbGciOiJIUzI1NiJ9.eyJzdHJlYW0iOiIzdmQ2MzNtN2N0enV2IiwiaG9zdCI6InN0cmVhbS0xNzMuemVuby5fbSIsInJ0dGwiOjUsImp0aSI6Im9QY19lN292UWFLdGUxSjFuNTI3M2ciLCJpYXQiOjE3NDM5MTQ0OTEsImV4cCI6MTc0MzkxNDU1MX0.UvA6Q0NuULFeRcHvqPJ9d68DeWz-0agoUBi8GDQWN0E", logo: "/images/radio_default_logo.jpg" },
      { name: "Siren Songs", location: "Belgium", url: "https://sirensongs-mynoise.radioca.st/live", logo: "/images/radio_default_logo.jpg" },
      { name: "Radio Relax", location: "Ukraine", url: "https://online.radiorelax.ua/RadioRelax_Instrumental_HD", logo: "/images/radio_default_logo.jpg" },
      { name: "Exclusively Kenny G", location: "Dubai", url: "https://2.mystreaming.net/er/kennyg/icecast.audio", logo: "/images/radio_default_logo.jpg" },
      { name: "Exclusively Jim Reeves", location: "Dubai", url: "https://nl4.mystreaming.net/er/jimreeves/icecast.audio", logo: "/images/radio_default_logo.jpg" },
      { name: "247 Praise Radio", location: "Jacksonville, Florida", url: "https://streaming.radio.co/s6da23ac69/listen", logo: "/images/radio_default_logo.jpg" },
      { name: "NPR News", location: "Washington DC", url: "https://npr-ice.streamguys1.com/live.mp3", logo: "/images/radio_default_logo.jpg" },
      { name: "Al Jazeera", location: "Qatar", url: "https://live-hls-audio-web-aje.getaj.net/VOICE-AJE/01.m3u8", logo: "/images/radio_default_logo.jpg" },
      { name: "CNN International", location: "Atlanta", url: "https://tunein.cdnstream1.com/3519_96.aac", logo: "/images/radio_default_logo.jpg" },
      { name: "BBC World Service", location: "London", url: "https://utulsa.streamguys1.com/KWGSHD3-MP3", logo: "/images/radio_default_logo.jpg" },
      { name: "BBC World Service", location: "West Africa", url: "https://stream.live.vc.bbcmedia.co.uk/bbc_world_service_west_africa", logo: "/images/radio_default_logo.jpg" },
      { name: "BBC World Service", location: "South Asia", url: "https://stream.live.vc.bbcmedia.co.uk/bbc_world_service_south_asia", logo: "/images/radio_default_logo.jpg" },
      { name: "BBC World Service", location: "Vermont", url: "https://vprbbc.streamguys1.com/vprbbc24.mp3", logo: "/images/radio_default_logo.jpg" },
      { name: "Capital FM", location: "London", url: "https://media-ssl.musicradio.com/CapitalMP3", logo: "/images/radio_default_logo.jpg" },
      { name: "WNYC", location: "New York", url: "https://fm939.wnyc.org/wnycfm-tunein", logo: "/images/radio_default_logo.jpg" },
      { name: "RTE Radio 1", location: "Dublin", url: "https://icecast.rte.ie/radio1", logo: "/images/radio_default_logo.jpg" },
      { name: "Virgin Radio UK", location: "London", url: "https://radio.virginradio.co.uk/stream", logo: "/images/radio_default_logo.jpg" },
      { name: "WBEZ", location: "Chicago", url: "http://wbez.streamguys1.com/wbez128.mp3", logo: "/images/radio_default_logo.jpg" },
      { name: "Talk Sport", location: "London", url: "https://radio.talksport.com/stream", logo: "/images/radio_default_logo.jpg" },
      { name: "Talk Sport 2", location: "London", url: "https://radio.talksport.com/stream2", logo: "/images/radio_default_logo.jpg" },
      { name: "Joy FM", location: "Accra", url: "http://provisioning.streamtheworld.com/pls/JOY_FM.pls", logo: "/images/radio_default_logo.jpg" },
      { name: "UBC Radio", location: "Kampala", url: "https://stream.ubc.go.ug/ubcradio", logo: "/images/radio_default_logo.jpg" },
      { name: "Metro FM", location: "Johannesburg", url: "https://playerservices.streamtheworld.com/api/livestream-redirect/METRO_FM.mp3", logo: "/images/radio_default_logo.jpg" },
      { name: "Black Information Network", location: "USA", url: "https://cloud.revma.ihrhls.com/zc8729?rj-org=n2db-e2&rj-ttl=5&rj-tok=AAABlmL2wq8ALLTq8zLJ1wWRdw", logo: "/images/radio_default_logo.jpg" },
      { name: "947", location: "Johannesburg", url: "https://playerservices.streamtheworld.com/api/livestream-redirect/FM947.mp3", logo: "/images/radio_default_logo.jpg" }
    ];


    let currentAlbumIndex = 0;
    let currentTrackIndex = 0;
    let currentRadioIndex = -1;

    // Streak Logic
    function updateStreak() {
      const now = new Date();
      const today = now.toDateString();
      const streakData = JSON.parse(localStorage.getItem('ariyoStreak')) || { streak: 0, lastDate: null };

      if (streakData.lastDate !== today) {
        const lastDate = streakData.lastDate ? new Date(streakData.lastDate) : null;
        if (lastDate) {
          const diffTime = now - lastDate;
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            streakData.streak += 1;
          } else if (diffDays > 1) {
            streakData.streak = 1; // Reset if more than a day is missed
          }
        } else {
          streakData.streak = 1; // First use
        }
        streakData.lastDate = today;
        localStorage.setItem('ariyoStreak', JSON.stringify(streakData));
      }

      streakInfo.textContent = `🔥 Current Streak: ${streakData.streak} days`;
      console.log(`Streak updated: ${streakData.streak} days`);
    }

    function savePlayerState() {
      const playerState = {
        albumIndex: currentAlbumIndex,
        trackIndex: currentTrackIndex,
        radioIndex: currentRadioIndex,
        playbackPosition: audioPlayer.currentTime,
        shuffleMode: shuffleMode,
        timestamp: new Date().getTime()
      };
      localStorage.setItem('ariyoPlayerState', JSON.stringify(playerState));
      console.log('Player state saved:', playerState);
    }

    function loadPlayerState() {
      const savedState = localStorage.getItem('ariyoPlayerState');
      if (savedState) {
        const playerState = JSON.parse(savedState);
        const ageInHours = (new Date().getTime() - playerState.timestamp) / (1000 * 60 * 60);
        if (ageInHours < 24) {
          return playerState;
        }
      }
      return null;
    }

    function updateTrackListModal() {
      const trackListContainer = document.querySelector('.track-list');
      trackListContainer.innerHTML = '';
      albums[currentAlbumIndex].tracks.forEach((track, index) => {
        const trackLink = document.createElement('a');
        trackLink.href = '#';
        trackLink.onclick = () => selectTrack(track.src, track.title, index);
        trackLink.textContent = track.title;
        trackListContainer.appendChild(trackLink);
      });
      console.log(`Track list updated for album: ${albums[currentAlbumIndex].name}`);
    }

    const stationsPerPage = 6;
let stationDisplayCounts = { nigeria: 0, westAfrica: 0, international: 0 };

// Region Classifier
function classifyStation(station) {
  const nigeriaLocations = ["Nigeria", "Lagos", "Ibadan", "Abuja", "Abeokuta", "Uyo", "Jos", "Kaduna", "Nassarawa", "Abia", "Ondo", "Calabar", "Aba"];
  const westAfricaLocations = ["Accra", "Ghana", "West Africa"];

  if (nigeriaLocations.includes(station.location)) return "nigeria";
  if (westAfricaLocations.includes(station.location)) return "westAfrica";
  return "international";
}

// Grouped Stations
const groupedStations = { nigeria: [], westAfrica: [], international: [] };
radioStations.forEach(station => {
  const region = classifyStation(station);
  groupedStations[region].push(station);
});

function updateRadioListModal() {
  stationDisplayCounts = { nigeria: 0, westAfrica: 0, international: 0 };

  ["nigeria", "westAfrica", "international"].forEach(region => {
    document.getElementById(`${region}-stations`).innerHTML = '';
    document.querySelector(`button[onclick="loadMoreStations('${region}')"]`).style.display = 'inline-block';
    loadMoreStations(region);
  });

  console.log("Grouped and displayed radio stations by region");
}

function loadMoreStations(region) {
  const container = document.getElementById(`${region}-stations`);
  const stations = groupedStations[region];
  const start = stationDisplayCounts[region];
  const end = start + stationsPerPage;

  stations.slice(start, end).forEach((station, index) => {
    const stationLink = document.createElement("a");
    stationLink.href = "#";
    stationLink.onclick = () => selectRadio(station.url, `${station.name} - ${station.location}`, index, station.logo);
    stationLink.textContent = `${station.name} (${station.location})`;
    container.appendChild(stationLink);
  });

  stationDisplayCounts[region] = end;

  if (stationDisplayCounts[region] >= stations.length) {
    document.querySelector(`button[onclick="loadMoreStations('${region}')"]`).style.display = 'none';
  }
}

    function selectAlbum(albumIndex) {
      console.log(`Selecting album: ${albums[albumIndex].name}`);
      currentAlbumIndex = albumIndex;
      currentTrackIndex = 0;
      currentRadioIndex = -1;
      albumCover.src = albums[currentAlbumIndex].cover;
      loadTrack(
        albums[currentAlbumIndex].tracks[currentTrackIndex].src,
        albums[currentAlbumIndex].tracks[currentTrackIndex].title,
        currentTrackIndex
      );
      updateTrackListModal();
      closeAlbumList();
      savePlayerState();
    }

    function loadTrack(src, title, index) {
      console.log(`Loading track: ${title} from album: ${albums[currentAlbumIndex].name}`);
      currentTrackIndex = index;
      currentRadioIndex = -1;
      audioPlayer.src = src;
      audioPlayer.currentTime = 0;
      trackInfo.textContent = title;
      trackArtist.textContent = 'Artist: Omoluabi';
      trackYear.textContent = 'Release Year: 2025';
      stopMusic();
      loadingSpinner.style.display = 'block';
      albumCover.style.display = 'none';
      retryButton.style.display = 'none';
      cacheButton.style.display = 'block'; // Show cache button for tracks
      document.getElementById('progressBar').style.display = 'block';
      progressBar.style.width = '0%';
    }

    function selectTrack(src, title, index) {
      console.log(`Selecting track: ${title} from album: ${albums[currentAlbumIndex].name}`);
      currentTrackIndex = index;
      currentRadioIndex = -1;
      lastTrackSrc = src;
      lastTrackTitle = title;
      lastTrackIndex = index;
      audioPlayer.src = src + '?t=' + new Date().getTime();
      audioPlayer.currentTime = 0;
      trackInfo.textContent = title;
      trackArtist.textContent = 'Artist: Omoluabi';
      trackYear.textContent = 'Release Year: 2025';
      closeTrackList();
      stopMusic();
      loadingSpinner.style.display = 'block';
      albumCover.style.display = 'none';
      retryButton.style.display = 'none';
      cacheButton.style.display = 'block'; // Show cache button
      document.getElementById('progressBar').style.display = 'block';
      progressBar.style.width = '0%';
      handleAudioLoad(src, title);
      updateMediaSession();
    }

    function selectRadio(src, title, index, logo) {
      console.log(`Selecting radio: ${title}`);
      currentRadioIndex = index;
      currentTrackIndex = -1;
      lastTrackSrc = src;
      lastTrackTitle = title;
      lastTrackIndex = index;
      audioPlayer.src = src;
      audioPlayer.currentTime = 0;
      trackInfo.textContent = title;
      trackArtist.textContent = '';
      trackYear.textContent = '';
      albumCover.src = logo;
      closeRadioList();
      stopMusic();
      loadingSpinner.style.display = 'block';
      albumCover.style.display = 'none';
      retryButton.style.display = 'none';
      cacheButton.style.display = 'none'; // Hide cache button for radio
      document.getElementById('progressBar').style.display = 'block';
      progressBar.style.width = '0%';
      handleAudioLoad(src, title);
      updateMediaSession();
    }

    function retryTrack() {
      if (currentRadioIndex >= 0) {
        selectRadio(lastTrackSrc, lastTrackTitle, lastTrackIndex, radioStations[currentRadioIndex].logo);
      } else {
        selectTrack(lastTrackSrc, lastTrackTitle, lastTrackIndex);
      }
    }

    function handleAudioLoad(src, title) {
      const playTimeout = setTimeout(() => {
        loadingSpinner.style.display = 'none';
        albumCover.style.display = 'block';
        document.getElementById('progressBar').style.display = 'none';
        trackInfo.textContent = 'Error: Stream failed to load (timeout)';
        retryButton.style.display = 'block';
        console.error(`Timeout: ${title} failed to buffer within 4 seconds`);
      }, 4000);

      audioPlayer.addEventListener('progress', () => {
        if (audioPlayer.buffered.length > 0 && audioPlayer.duration) {
          const bufferedEnd = audioPlayer.buffered.end(0);
          const duration = audioPlayer.duration;
          progressBar.style.width = `${(bufferedEnd / duration) * 100}%`;
        }
      });

      audioPlayer.addEventListener('canplaythrough', () => {
        clearTimeout(playTimeout);
        loadingSpinner.style.display = 'none';
        albumCover.style.display = 'block';
        document.getElementById('progressBar').style.display = 'none';
        console.log(`Stream ${title} can play through`);
        if (!isFirstPlay) {
          audioPlayer.play().catch(error => handlePlayError(error, title));
        }
      }, { once: true });

      audioPlayer.addEventListener('canplay', () => {
        if (loadingSpinner.style.display === 'block') {
          clearTimeout(playTimeout);
          loadingSpinner.style.display = 'none';
          albumCover.style.display = 'block';
          document.getElementById('progressBar').style.display = 'none';
          console.log(`Stream ${title} can play (fallback)`);

    updateMediaSession(); // ✅ Move it here

          if (!isFirstPlay) {
            audioPlayer.play().catch(error => handlePlayError(error, title));
          }
        }
      }, { once: true });

      audioPlayer.addEventListener('error', () => {
        clearTimeout(playTimeout);
        loadingSpinner.style.display = 'none';
        albumCover.style.display = 'block';
        document.getElementById('progressBar').style.display = 'none';
        fetch(audioPlayer.src)
          .then(res => res.json())
          .then(data => {
            if (data.error) trackInfo.textContent = data.error;
          })
          .catch(() => trackInfo.textContent = 'Error: Unable to load stream');
        retryButton.style.display = 'block';
        console.error(`Audio error for ${title}:`, audioPlayer.error);
        if (audioPlayer.error) {
          console.error(`Error code: ${audioPlayer.error.code}, Message: ${audioPlayer.error.message}`);
        }
      }, { once: true });

      audioPlayer.load(); // Force load
    }

    function manageVinylRotation() {
      if (!audioPlayer.paused && !audioPlayer.ended) {
        albumCover.classList.add('spin');
      } else {
        albumCover.classList.remove('spin');
      }
    }

    function playMusic() {
      if (audioPlayer.src) {
        loadingSpinner.style.display = 'block';
        albumCover.style.display = 'none';
        retryButton.style.display = 'none';
        document.getElementById('progressBar').style.display = 'block';
        progressBar.style.width = '0%';

        const playTimeout = setTimeout(() => {
          loadingSpinner.style.display = 'none';
          albumCover.style.display = 'block';
          document.getElementById('progressBar').style.display = 'none';
          trackInfo.textContent = 'Error: Stream failed to load (timeout)';
          retryButton.style.display = 'block';
          console.error('Timeout: Stream failed to buffer within 4 seconds');
        }, 4000);

        audioPlayer.addEventListener('progress', () => {
          if (audioPlayer.buffered.length > 0 && audioPlayer.duration) {
            const bufferedEnd = audioPlayer.buffered.end(0);
            const duration = audioPlayer.duration;
            progressBar.style.width = `${(bufferedEnd / duration) * 100}%`;
          }
        });

        audioPlayer.addEventListener('canplaythrough', () => {
          clearTimeout(playTimeout);
          loadingSpinner.style.display = 'none';
          albumCover.style.display = 'block';
          document.getElementById('progressBar').style.display = 'none';
          console.log(`Stream ${trackInfo.textContent} can play through`);
          attemptPlay();
        }, { once: true });

        audioPlayer.addEventListener('canplay', () => {
          if (loadingSpinner.style.display === 'block') {
            clearTimeout(playTimeout);
            loadingSpinner.style.display = 'none';
            albumCover.style.display = 'block';
            document.getElementById('progressBar').style.display = 'none';
            console.log(`Stream ${trackInfo.textContent} can play (fallback)`);
            attemptPlay();
          }
        }, { once: true });

        audioPlayer.addEventListener('error', () => {
          clearTimeout(playTimeout);
          loadingSpinner.style.display = 'none';
          albumCover.style.display = 'block';
          document.getElementById('progressBar').style.display = 'none';
          fetch(audioPlayer.src)
            .then(res => res.json())
            .then(data => {
              if (data.error) trackInfo.textContent = data.error;
            })
            .catch(() => trackInfo.textContent = 'Error: Unable to load stream');
          retryButton.style.display = 'block';
          console.error('Audio error:', audioPlayer.error);
        }, { once: true });

        audioPlayer.load(); // Force load
      }
    }

    function attemptPlay() {
      audioPlayer.play()
        .then(() => {
          manageVinylRotation();
          audioPlayer.removeEventListener('timeupdate', updateTrackTime);
          audioPlayer.addEventListener('timeupdate', updateTrackTime);
          console.log(`Playing: ${trackInfo.textContent}`);
          updateStreak();
          savePlayerState();
          gsap.fromTo(albumCover,
            { scale: 1 },
            { scale: 1.1, yoyo: true, repeat: 1, duration: 0.3, ease: "bounce.out" }
          );
          isFirstPlay = false;
        })
        .catch(error => handlePlayError(error, trackInfo.textContent));
    }

    function handlePlayError(error, title) {
      loadingSpinner.style.display = 'none';
      albumCover.style.display = 'block';
      document.getElementById('progressBar').style.display = 'none';
      retryButton.style.display = 'block';
      console.error(`Error playing ${title}:`, error);
      trackInfo.textContent = navigator.onLine ? 'Error playing stream' : 'Offline - Stream unavailable';
    }

    function pauseMusic() {
      audioPlayer.pause();
      manageVinylRotation();
      audioPlayer.removeEventListener('timeupdate', updateTrackTime);
      console.log('Paused');
      savePlayerState();
    }

    function stopMusic() {
      audioPlayer.pause();
      audioPlayer.currentTime = 0;
      manageVinylRotation();
      audioPlayer.removeEventListener('timeupdate', updateTrackTime);
      seekBar.value = 0;
      trackDuration.textContent = '0:00 / 0:00';
      console.log('Stopped');
      savePlayerState();
    }

    function updateTrackTime() {
  const currentTime = audioPlayer.currentTime;

  // 🔒 If it's a radio stream, don't format duration
  if (currentRadioIndex >= 0 || !isFinite(audioPlayer.duration)) {
    trackDuration.textContent = `${formatTime(currentTime)} / Live`;
    seekBar.style.display = 'none'; // hide seekbar for radio
    return;
  }

  const duration = audioPlayer.duration || 0;

  if (!isNaN(duration) && duration > 0) {
    trackDuration.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
    seekBar.value = (currentTime / duration) * 100;
    seekBar.style.display = 'block';
    savePlayerState();
  } else {
    trackDuration.textContent = `${formatTime(currentTime)} / Loading...`;
    seekBar.style.display = 'block';
  }
}

    function formatTime(seconds) {
      const minutes = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${minutes}:${secs < 10 ? '0' + secs : secs}`;
    }

    function seekAudio(value) {
      if (audioPlayer.duration && currentRadioIndex === -1) {
        const newTime = (value / 100) * audioPlayer.duration;
        audioPlayer.currentTime = newTime;
        updateTrackTime();
      }
    }

    seekBar.addEventListener('input', () => seekAudio(seekBar.value));
    seekBar.addEventListener('touchstart', () => audioPlayer.pause(), { passive: true });
    seekBar.addEventListener('touchend', () => {
      seekAudio(seekBar.value);
      if (!audioPlayer.paused) audioPlayer.play();
    });

    audioPlayer.addEventListener('loadedmetadata', updateTrackTime);

    audioPlayer.addEventListener('ended', () => {
      audioPlayer.removeEventListener('timeupdate', updateTrackTime);
      manageVinylRotation();
      if (currentRadioIndex === -1) {
        if (shuffleMode) {
          const randomIndex = Math.floor(Math.random() * albums[currentAlbumIndex].tracks.length);
          selectTrack(
            albums[currentAlbumIndex].tracks[randomIndex].src,
            albums[currentAlbumIndex].tracks[randomIndex].title,
            randomIndex
          );
        } else {
          currentTrackIndex = (currentTrackIndex + 1) % albums[currentAlbumIndex].tracks.length;
          selectTrack(
            albums[currentAlbumIndex].tracks[currentTrackIndex].src,
            albums[currentAlbumIndex].tracks[currentTrackIndex].title,
            currentTrackIndex
          );
        }
        audioPlayer.addEventListener('canplay', () => {
          audioPlayer.play();
          audioPlayer.addEventListener('timeupdate', updateTrackTime);
          manageVinylRotation();
        }, { once: true });
      }
    });

    audioPlayer.addEventListener('play', manageVinylRotation);
    audioPlayer.addEventListener('pause', manageVinylRotation);
    audioPlayer.addEventListener('ended', manageVinylRotation);

audioPlayer.addEventListener('playing', () => {
  audioPlayer.removeEventListener('timeupdate', updateTrackTime); // clear old listener
  audioPlayer.addEventListener('timeupdate', updateTrackTime);    // reattach freshly
  updateTrackTime();  // update UI instantly
  manageVinylRotation(); // spin the album cover if needed
  console.log(`🎧 Time tracking active: ${trackInfo.textContent}`);
});

    function setupDropdownKeyEvents() {
      const dropdowns = document.querySelectorAll('.dropdown[role="button"]');
      dropdowns.forEach(dropdown => {
        dropdown.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault(); // Prevent default space bar scroll
            dropdown.click(); // Trigger the existing onclick handler
          }
        });
      });
    }

    function nextTrack() {
      if (currentRadioIndex === -1) {
        if (shuffleMode) {
          const randomIndex = Math.floor(Math.random() * albums[currentAlbumIndex].tracks.length);
          selectTrack(
            albums[currentAlbumIndex].tracks[randomIndex].src,
            albums[currentAlbumIndex].tracks[randomIndex].title,
            randomIndex
          );
        } else {
          currentTrackIndex = (currentTrackIndex + 1) % albums[currentAlbumIndex].tracks.length;
          selectTrack(
            albums[currentAlbumIndex].tracks[currentTrackIndex].src,
            albums[currentAlbumIndex].tracks[currentTrackIndex].title,
            currentTrackIndex
          );
        }
        if (!audioPlayer.paused) {
          audioPlayer.addEventListener('canplay', () => {
            audioPlayer.play();
            manageVinylRotation();
          }, { once: true });
        }
      }
    }

    function previousTrack() {
      if (currentRadioIndex === -1) {
        if (shuffleMode) {
          const randomIndex = Math.floor(Math.random() * albums[currentAlbumIndex].tracks.length);
          selectTrack(
            albums[currentAlbumIndex].tracks[randomIndex].src,
            albums[currentAlbumIndex].tracks[randomIndex].title,
            randomIndex
          );
        } else {
          currentTrackIndex = (currentTrackIndex - 1 + albums[currentAlbumIndex].tracks.length) % albums[currentAlbumIndex].tracks.length;
          selectTrack(
            albums[currentAlbumIndex].tracks[currentTrackIndex].src,
            albums[currentAlbumIndex].tracks[currentTrackIndex].title,
            currentTrackIndex
          );
        }
        if (!audioPlayer.paused) {
          audioPlayer.addEventListener('canplay', () => {
            audioPlayer.play();
            manageVinylRotation();
          }, { once: true });
        }
      }
    }

    function openAlbumList() {
      const modal = document.getElementById('albumModal');
      modal.style.display = 'block';
      gsap.fromTo(modal.querySelector('.modal-content'),
        { scale: 0.8, opacity: 0, y: 50 },
        { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
      );
      console.log('Album list opened');
    }

    function closeAlbumList() {
      const modal = document.getElementById('albumModal');
      gsap.to(modal.querySelector('.modal-content'),
        { scale: 0.8, opacity: 0, y: 50, duration: 0.3, ease: "power2.in",
          onComplete: () => { modal.style.display = 'none'; }
        }
      );
      console.log('Album list closed');
    }

    function openTrackList() {
      updateTrackListModal();
      const modal = document.getElementById('trackModal');
      modal.style.display = 'block';
      gsap.fromTo(modal.querySelector('.modal-content'),
        { scale: 0.8, opacity: 0, y: 50 },
        { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
      );
      console.log('Track list opened');
    }

    function closeTrackList() {
      const modal = document.getElementById('trackModal');
      gsap.to(modal.querySelector('.modal-content'),
        { scale: 0.8, opacity: 0, y: 50, duration: 0.3, ease: "power2.in",
          onComplete: () => { modal.style.display = 'none'; }
        }
      );
      console.log('Track list closed');
    }

    function openRadioList() {
      updateRadioListModal();
      const modal = document.getElementById('radioModal');
      modal.style.display = 'block';
      gsap.fromTo(modal.querySelector('.modal-content'),
        { scale: 0.8, opacity: 0, y: 50 },
        { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
      );
      console.log('Radio list opened');
    }

    function closeRadioList() {
      const modal = document.getElementById('radioModal');
      gsap.to(modal.querySelector('.modal-content'),
        { scale: 0.8, opacity: 0, y: 50, duration: 0.3, ease: "power2.in",
          onComplete: () => { modal.style.display = 'none'; }
        }
      );
      console.log('Radio list closed');
    }

    function toggleShuffle() {
      shuffleMode = !shuffleMode;
      const controls = document.querySelector(".music-controls.icons-only");
      const shuffleBtn = controls.querySelector('button:nth-child(6)');
      shuffleBtn.textContent = shuffleMode ? '(ON)' : '🔀';
      console.log(`Shuffle mode: ${shuffleMode ? 'ON' : 'OFF'}`);
      savePlayerState();
    }

    /* CHATBOT & SABI BIBLE TOGGLE WITH US SPOOFING */
const chatbotContainer = document.getElementById('chatbotContainer');
const sabiBibleContainer = document.getElementById('sabiBibleContainer');

// Spoof user as if dem dey America
window.spoofedLocation = {country:"US",timezone:"America/New_York",language:"en-US"};
console.log("US Spoof Active:", window.spoofedLocation);

function toggleChatbot(){
  const isHidden = chatbotContainer.style.display === 'none' || !chatbotContainer.style.display;
  chatbotContainer.style.display = isHidden ? 'block' : 'none';
  console.log("Chatbot opened as US user:", window.spoofedLocation);
  const chatbotEmbed = chatbotContainer.querySelector("zapier-interfaces-chatbot-embed");
  if(chatbotEmbed){
    chatbotEmbed.setAttribute("language",window.spoofedLocation.language);
    chatbotEmbed.setAttribute("region",window.spoofedLocation.country);
    chatbotEmbed.setAttribute("timezone",window.spoofedLocation.timezone);
  }
}

function toggleSabiBible(){
  const isHidden = sabiBibleContainer.style.display === 'none' || !sabiBibleContainer.style.display;
  sabiBibleContainer.style.display = isHidden ? 'block' : 'none';
  console.log("Sabi Bible opened as US user:", window.spoofedLocation);
  const sabiEmbed = sabiBibleContainer.querySelector("zapier-interfaces-chatbot-embed");
  if(sabiEmbed){
    sabiEmbed.setAttribute("language",window.spoofedLocation.language);
    sabiEmbed.setAttribute("region",window.spoofedLocation.country);
    sabiEmbed.setAttribute("timezone",window.spoofedLocation.timezone);
  }
}

    /* DYNAMIC AUDIO CACHING */
    function cacheTrackForOffline(trackUrl) {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CACHE_TRACK',
          url: trackUrl
        });
        console.log(`Requested caching for: ${trackUrl}`);
      } else {
        console.warn('Service worker not available for caching');
        alert('Offline caching unavailable. Please try again later.');
      }
    }

    // Listen for caching confirmation from service worker
    navigator.serviceWorker.onmessage = (event) => {
      if (event.data && event.data.type === 'TRACK_CACHED') {
        console.log(`Track cached successfully: ${event.data.url}`);
        const trackName = decodeURIComponent(event.data.url.split('/').pop().replace(/\.mp3.*/i, ''));
        showToast(`"${trackName}" cached for offline use!`);
      }
    };

    /* TOAST NOTIFICATION */
    function showToast(message, duration = 3000) {
      const toast = document.getElementById('nowPlayingToast');
      if (toast) {
        toast.textContent = message;
        toast.style.display = 'block';
        gsap.fromTo(toast,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.4, ease: "power2.out",
            onComplete: () => {
              setTimeout(() => {
                gsap.to(toast, { opacity: 0, y: 20, duration: 0.4, ease: "power2.in", onComplete: () => toast.style.display = 'none' });
              }, duration);
            }
          }
        );
      }
    }

    /* MEDIA SESSION API */
    function updateMediaSession() {
      if ('mediaSession' in navigator) {
        const track = currentRadioIndex === -1
          ? albums[currentAlbumIndex].tracks[currentTrackIndex]
          : radioStations[currentRadioIndex];
        const artwork = currentRadioIndex === -1
          ? albums[currentAlbumIndex].cover
          : radioStations[currentRadioIndex].logo;

        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentRadioIndex === -1 ? track.title : track.name + ' - ' + track.location,
          artist: currentRadioIndex === -1 ? 'Omoluabi' : '',
          album: currentRadioIndex === -1 ? albums[currentAlbumIndex].name : '',
          artwork: [
            { src: artwork, sizes: '96x96', type: 'image/jpeg' },
            { src: artwork, sizes: '128x128', type: 'image/jpeg' },
            { src: artwork, sizes: '192x192', type: 'image/jpeg' },
            { src: artwork, sizes: '256x256', type: 'image/jpeg' },
            { src: artwork, sizes: '384x384', type: 'image/jpeg' },
            { src: artwork, sizes: '512x512', type: 'image/jpeg' }
          ]
        });

        navigator.mediaSession.setActionHandler('play', playMusic);
        navigator.mediaSession.setActionHandler('pause', pauseMusic);
        navigator.mediaSession.setActionHandler('stop', stopMusic);
        navigator.mediaSession.setActionHandler('nexttrack', nextTrack);
        navigator.mediaSession.setActionHandler('previoustrack', previousTrack);

        console.log('Media Session updated with artwork');
      }
    }

    audioPlayer.addEventListener('timeupdate', () => {
      if ('mediaSession' in navigator && audioPlayer.duration && currentRadioIndex === -1) {
        navigator.mediaSession.setPositionState({
          duration: audioPlayer.duration,
          playbackRate: audioPlayer.playbackRate,
          position: audioPlayer.currentTime
        });
      }
    });

    function initializePlayer() {
      const savedState = loadPlayerState();
      if (savedState) {
        currentAlbumIndex = savedState.albumIndex;
        currentTrackIndex = savedState.trackIndex;
        currentRadioIndex = savedState.radioIndex;
        shuffleMode = savedState.shuffleMode;
        if (currentRadioIndex >= 0) {
          const station = radioStations[currentRadioIndex];
          albumCover.src = station.logo;
          audioPlayer.src = station.url;
          trackInfo.textContent = `${station.name} - ${station.location}`;
          trackArtist.textContent = '';
          trackYear.textContent = '';
          cacheButton.style.display = 'none'; // Hide for radio
          audioPlayer.addEventListener('loadedmetadata', () => {
            audioPlayer.currentTime = savedState.playbackPosition;
            updateTrackTime();
            manageVinylRotation();
          }, { once: true });
        } else {
          albumCover.src = albums[currentAlbumIndex].cover;
          const track = albums[currentAlbumIndex].tracks[currentTrackIndex];
          audioPlayer.src = track.src;
          trackInfo.textContent = track.title;
          trackArtist.textContent = 'Artist: Omoluabi';
          trackYear.textContent = 'Release Year: 2025';
          cacheButton.style.display = 'block'; // Show for tracks
          audioPlayer.addEventListener('loadedmetadata', () => {
            audioPlayer.currentTime = savedState.playbackPosition;
            updateTrackTime();
            manageVinylRotation();
          }, { once: true });
        }
        updateTrackListModal();
        const controls = document.querySelector(".music-controls.icons-only");
        const shuffleBtn = controls.querySelector('button:nth-child(6)');
        shuffleBtn.textContent = shuffleMode ? '(ON)' : '🔀';
        console.log('Player restored from saved state:', savedState);
      } else {
        selectAlbum(0);
        console.log('No saved state found, initialized with default');
      }
      updateStreak();
      updateMediaSession();
    }

    // GSAP Sidebar Button Animations
    document.querySelectorAll('.sidebar button').forEach(button => {
      button.addEventListener('mouseenter', () => {
        gsap.to(button, { scale: 1.08, duration: 0.3, ease: "power2.out" });
      });
      button.addEventListener('mouseleave', () => {
        gsap.to(button, { scale: 1, duration: 0.3, ease: "power2.out" });
      });
      button.addEventListener('click', () => {
        gsap.to(button, {
          scale: 0.95,
          duration: 0.1,
          ease: "power1.in",
          onComplete: () => gsap.to(button, { scale: 1, duration: 0.2, ease: "bounce.out" })
        });
      });
    });

    // Register Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then(registration => {
            console.log('Service Worker registered with scope:', registration.scope);
          })
          .catch(error => {
            console.error('Service Worker registration failed:', error);
          });
      });
    }

    // Initialize player
    initializePlayer();
    setupDropdownKeyEvents(); // Add this call

    // Save state before unloading
    window.addEventListener('beforeunload', savePlayerState);

    // PWA Install Prompt
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      console.log('Install prompt available');
      const installBtn = document.createElement('button');
      installBtn.textContent = 'Install Àríyò AI';
      installBtn.style.position = 'fixed';
      installBtn.style.bottom = '20px';
      installBtn.style.right = '20px';
      installBtn.style.background = '#ff758c';
      installBtn.style.color = 'white';
      installBtn.style.padding = '10px 20px';
      installBtn.style.border = 'none';
      installBtn.style.borderRadius = '5px';
      installBtn.style.zIndex = '1000';
      installBtn.onclick = () => {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User installed the app');
          }
          deferredPrompt = null;
          installBtn.remove();
        });
      };
      document.body.appendChild(installBtn);
    });

    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
    });

    // Handle visibility change to fix track time bar after sleep
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !audioPlayer.paused) {
        audioPlayer.removeEventListener('timeupdate', updateTrackTime);
        audioPlayer.addEventListener('timeupdate', updateTrackTime);
        updateTrackTime();
        console.log('Page visible, reattached timeupdate listener');
      }
    });
