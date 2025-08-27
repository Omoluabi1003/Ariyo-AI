const BASE_URL = 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/';
const TOA_URL = 'https://raw.githubusercontent.com/Omoluabi1003/Terms-Of-Agreement/main/';
const DD_URL = 'https://raw.githubusercontent.com/Omoluabi1003/DD/main/';
const albums = [
      {
        name: 'Kindness',
        cover: `${BASE_URL}Kindness%20Cover%20Art.jpg`,
        tracks: [
          { src: `${BASE_URL}A%20Very%20Good%20Bad%20Guy%20v3.mp3`, title: 'A Very Good Bad Guy v3' },
          { src: `${BASE_URL}Dem%20Wan%20Shut%20Me%20Up.mp3`, title: 'Dem Wan Shut Me Up' },
          { src: `${BASE_URL}EFCC.mp3`, title: 'EFCC' },
          { src: `${BASE_URL}Emergency.mp3`, title: 'Emergency' },
          { src: `${BASE_URL}Film%20Trick%20Election.mp3`, title: 'Film Trick Election' },
          { src: `${BASE_URL}Gbas%20Gbos.mp3`, title: 'Gbas Gbos' },
          { src: `${BASE_URL}Kindness%20(Remastered).mp3`, title: 'Kindness (Remastered)' },
          { src: `${BASE_URL}Locked%20Away.mp3`, title: 'Locked Away' },
          { src: `${BASE_URL}Multi%20choice%20palava.mp3`, title: 'Multi choice palava' },
          { src: `${BASE_URL}Na%20My%20Turn.mp3`, title: 'Na My Turn' },
          { src: `${BASE_URL}Ogoni%20Anthem%20(Remastered).mp3`, title: 'Ogoni Anthem (Remastered)' },
          { src: `${BASE_URL}Ogoni%20Anthem.mp3`, title: 'Ogoni Anthem' },
          { src: `${BASE_URL}Rich%20Pauper.mp3`, title: 'Rich Pauper' },
          { src: `${BASE_URL}Senator%20Natasha’s%20Whisper.mp3`, title: 'Senator Natasha’s Whisper' },
          { src: `${BASE_URL}Sharing%20Formula.mp3`, title: 'Sharing Formula' },
          { src: `${BASE_URL}Show%20Of%20Shame%20v3%20(Remastered).mp3`, title: 'Show Of Shame v3 (Remastered)' },
          { src: `${BASE_URL}Subsidy.mp3`, title: 'Subsidy' },
          { src: `${BASE_URL}Vex%20Money.mp3`, title: 'Vex Money' },
          { src: `${BASE_URL}Working%20on%20myself.mp3`, title: 'Working on myself' }
        ]
      },
      {
        name: 'Street Sense',
        cover: `${BASE_URL}Street_Sense_Album_Cover.jpg`,
        tracks: [
          { src: `${BASE_URL}Na%20We%20Dey.mp3`, title: 'Na We Dey' },
          { src: `${BASE_URL}No%20Be%20My%20Story.mp3`, title: 'No Be My Story' },
          { src: `${BASE_URL}Algorithm%20Of%20Life.mp3`, title: 'Algorithm of life' },
          { src: `${BASE_URL}Babygirl.mp3`, title: 'Babygirl' },
          { src: `${BASE_URL}Ubuntu.mp3`, title: 'Ubuntu' },
          { src: `${BASE_URL}Blood%20On%20The%20Lithium.mp3`, title: 'Blood On The Lithium' },
          { src: `${BASE_URL}Oluwa%20You%20Too%20Good.mp3`, title: 'Oluwa You Too Good' },
          { src: `${BASE_URL}Freedom%20of%20Speech.mp3`, title: 'Freedom of Speech' },
          { src: `${BASE_URL}E%20Get%20Why.mp3`, title: 'E Get Why' },
          { src: `${BASE_URL}Am%20grateful%20Lord.mp3`, title: 'Am grateful Lord' },
          { src: `${BASE_URL}Game%20Of%20Thrones.mp3`, title: 'Game of Thrones' },
          { src: `${BASE_URL}Give%20and%20Take%20(Reciprocity%20in%20love).mp3`, title: 'Give and Take (Reciprocity in love)' },
          { src: `${BASE_URL}Midas%20Touch.mp3`, title: 'Midas Touch' },
          { src: `${BASE_URL}Naija%20Youth;%20Rise.mp3`, title: 'Naija Youth, Rise' },
          { src: `${BASE_URL}Party%20No%20Go%20Stop.mp3`, title: 'Party No Go Stop' },
          { src: `${BASE_URL}Pigeonhole%20Gbedu.mp3`, title: 'Pigeonhole Gbedu' },
          { src: `${BASE_URL}Queen%20Warrior.mp3`, title: 'Queen Warrior' },
          { src: `${BASE_URL}Holy%20Vibes%20Only.mp3`, title: 'Holy Vibes Only' },
          { src: `${BASE_URL}Sengemenge.mp3`, title: 'Sengemenge' },
          { src: `${BASE_URL}Sowore.mp3`, title: 'Sowore' },
          { src: `${BASE_URL}Street%20Sense.mp3`, title: 'Street Sense' },
          { src: `${BASE_URL}VDM.mp3`, title: 'VDM' },
          { src: `${BASE_URL}We%20Are%20Not%20Doing%20That.mp3`, title: 'We Are Not Doing That' },
          { src: `${BASE_URL}Oil%20Money.mp3`, title: 'Oil Money' },
          { src: `${BASE_URL}Gbamsolutely.mp3`, title: 'Gbamsolutely' },
          { src: `${BASE_URL}Mic%20No%20Be%20For%20Waist.mp3`, title: 'Mic No Be For Waist' }
        ]
      },
      {
        name: 'Dirty Dancing- Original Soundtrack From The Vestron Motion Picture',
        artist: 'Various Artists',
        cover: `${BASE_URL}Dirty%20Dancing.jpg`,
        releaseYear: 1987,
        tracks: [
          { src: `${DD_URL}01%20The%20Time%20Of%20My%20Life.mp3`, title: "(I've Had) The Time Of My Life" },
          { src: `${DD_URL}02%20Be%20My%20Baby.mp3`, title: 'Be My Baby' },
          { src: `${DD_URL}03%20She_s%20Like%20The%20Wind.mp3`, title: "She's Like The Wind" },
          { src: `${DD_URL}04%20Hungry%20Eyes.mp3`, title: 'Hungry Eyes' },
          { src: `${DD_URL}05%20Stay.mp3`, title: 'Stay' },
          { src: `${DD_URL}06%20Yes.mp3`, title: 'Yes' },
          { src: `${DD_URL}07%20You%20Don_t%20Own%20Me.mp3`, title: "You Don't Own Me" },
          { src: `${DD_URL}08%20Hey%20Baby.mp3`, title: 'Hey Baby' },
          { src: `${DD_URL}09%20Overload.mp3`, title: 'Overload' },
          { src: `${DD_URL}10%20Love%20Is%20Strange.mp3`, title: 'Love Is Strange' },
          { src: `${DD_URL}11%20Where%20Are%20You%20Tonight-.mp3`, title: 'Where Are You Tonight?' },
          { src: `${DD_URL}12%20In%20The%20Still%20Of%20The%20Night.mp3`, title: 'In The Still Of The Night' }
        ]
      },
      {
        name: 'Needs',
        cover: 'https://raw.githubusercontent.com/Omoluabi1003/afro-gospel-stream/main/FaithandB.jpg',
        tracks: [
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/afro-gospel-stream/main/Disappoint%20People%20Early.mp3', title: 'Disappoint People Early' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/afro-gospel-stream/main/Faded%20Hues.mp3', title: 'Faded Hues' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/afro-gospel-stream/main/False%20Alarm.mp3', title: 'False Alarm' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/afro-gospel-stream/main/Glorified%20Caterpillar.mp3', title: 'Glorified Caterpillar' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/afro-gospel-stream/main/Hear%20the%20Earth%20Speak.mp3', title: 'Hear the Earth Speak' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/afro-gospel-stream/main/Let%20Me%20Be%20Seen.mp3', title: 'Let Me Be Seen' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/afro-gospel-stream/main/Little%20Things.mp3', title: 'Little Things' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/afro-gospel-stream/main/Needs.mp3', title: 'Needs' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/afro-gospel-stream/main/Not%20This%20Road.mp3', title: 'Not This Road' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/afro-gospel-stream/main/Permitted%20Blessing.mp3', title: 'Permitted Blessing' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/afro-gospel-stream/main/Right%20In%20Front.mp3', title: 'Right In Front' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/afro-gospel-stream/main/Scaffolding.mp3', title: 'Scaffolding' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/afro-gospel-stream/main/Stay%20Sincere.mp3', title: 'Stay Sincere' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/afro-gospel-stream/main/Thank%20You%20For%20The%20Wound.mp3', title: 'Thank You For The Wound' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/afro-gospel-stream/main/The%20Weight%20You%20Carry.mp3', title: 'The Weight You Carry' }
        ]
      },
      {
        name: 'Holy Vibes Only',
        cover: 'https://raw.githubusercontent.com/Omoluabi1003/afro-gospel-stream/main/Neo-Soul.jpg',
        tracks: [
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/afro-gospel-stream/main/Am%20grateful%20Lord%20%28Instrumental%29.mp3', title: 'Am grateful Lord (Instrumental)' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/afro-gospel-stream/main/Am%20grateful%20Lord.mp3', title: 'Am grateful Lord' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/afro-gospel-stream/main/Holy%20Vibes%20Only%20%28Instrumental%29.mp3', title: 'Holy Vibes Only (Instrumental)' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/afro-gospel-stream/main/Holy%20Vibes%20Only.mp3', title: 'Holy Vibes Only' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/afro-gospel-stream/main/Na%20So%20God%20Dey%20Do.mp3', title: 'Na So God Dey Do' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/afro-gospel-stream/main/Na%20You.mp3', title: 'Na You' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/afro-gospel-stream/main/Oil%20No%20Dry.mp3', title: 'Oil No Dry' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/afro-gospel-stream/main/Oluwa%20You%20Too%20Good.mp3', title: 'Oluwa You Too Good' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/afro-gospel-stream/main/Recognize%20Me%20%28Instrumental%29.mp3', title: 'Recognize Me (Instrumental)' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/afro-gospel-stream/main/Recognize%20Me.mp3', title: 'Recognize Me' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/afro-gospel-stream/main/Rotten%20Fruit.mp3', title: 'Rotten Fruit' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/afro-gospel-stream/main/Still%20I%20Rise%20to%20Praise.mp3', title: 'Still I Rise to Praise' },
          { src: 'https://raw.githubusercontent.com/Omoluabi1003/afro-gospel-stream/main/Testimony%20No%20Dey%20Finish.mp3', title: 'Testimony No Dey Finish' }
        ]
      },
      {
        name: 'Terms Of Agreement',
        cover: `${TOA_URL}TOA%20Album%20Art.png`,
        tracks: [
            { src: `${TOA_URL}419.mp3`, title: '419' },
            { src: `${TOA_URL}Adimula%20Global.mp3`, title: 'Adimula Global' },
            { src: `${TOA_URL}Africa%20Song.mp3`, title: 'Africa Song' },
            { src: `${TOA_URL}Alujo%20For%20The%20Most%20High.mp3`, title: 'Alujo For The Most High' },
            { src: `${TOA_URL}As%20E%20Dey%20Hot.mp3`, title: 'As E Dey Hot' },
            { src: `${TOA_URL}Bleaching.mp3`, title: 'Bleaching' },
            { src: `${TOA_URL}Breaking%20Altars.mp3`, title: 'Breaking Altars' },
            { src: `${TOA_URL}Buried%20Gold.mp3`, title: 'Buried Gold' },
            { src: `${TOA_URL}Chained%20Headspace.mp3`, title: 'Chained Headspace' },
            { src: `${TOA_URL}Coalition%20Of%20Confusion.mp3`, title: 'Coalition Of Confusion' },
            { src: `${TOA_URL}Divine%20Twin.mp3`, title: 'Divine Twin' },
            { src: `${TOA_URL}Fathers%20That%20Left.mp3`, title: 'Fathers That Left' },
            { src: `${TOA_URL}GMO%20Seeds.mp3`, title: 'GMO Seeds' },
            { src: `${TOA_URL}Hail%20Mary.mp3`, title: 'Hail Mary' },
            { src: `${TOA_URL}More%20Stars%20Online.mp3`, title: 'More Stars Online' },
            { src: `${TOA_URL}Nigeria.mp3`, title: 'Nigeria' },
            { src: `${TOA_URL}Oga%20Jesus.mp3`, title: 'Oga Jesus' },
            { src: `${TOA_URL}Omo%20Oba.mp3`, title: 'Omo Oba' },
            { src: `${TOA_URL}Our%20Fada.mp3`, title: 'Our Fada' },
            { src: `${TOA_URL}Parrot.mp3`, title: 'Parrot' },
            { src: `${TOA_URL}Rigged%20Game.mp3`, title: 'Rigged Game' },
            { src: `${TOA_URL}Starvation%20Trap.mp3`, title: 'Starvation Trap' },
            { src: `${TOA_URL}Terms%20Of%20Agreement.mp3`, title: 'Terms Of Agreement' },
            { src: `${TOA_URL}The%20Shoulders%20We%20Stand%20On.mp3`, title: 'The Shoulders We Stand On' }
        ]
      },
        {
          name: 'Omoluabi Production Catalogue',
          cover: `${BASE_URL}Logo.jpg`,
          tracks: [
            { src: 'https://cdn1.suno.ai/5c17dd10-1770-467a-947a-db773c72ec78.mp3', title: 'Watchman' },
            { src: 'https://cdn1.suno.ai/fb1daddf-1de4-4164-bb9d-113f9639d732.mp3', title: 'Ọmọlúàbí' },
            { src: 'https://cdn1.suno.ai/d3ec2b0a-6062-417f-a62c-4d746f7f4f57.mp3', title: 'Take The Risk' },
            { src: 'https://cdn1.suno.ai/d5669af3-5caf-49e2-aca4-47fbc73a6d25.mp3', title: 'TikTok' },
            { src: 'https://cdn1.suno.ai/800b9280-4389-47f6-b20d-6aa7dd3298ad.mp3', title: 'Something Is About To Happen' },
            { src: 'https://cdn1.suno.ai/160aa857-a65f-4f60-9217-6045b2091183.mp3', title: 'Haters' },
            { src: 'https://cdn1.suno.ai/c6e3b4e8-964c-48dc-8187-3005865cb00a.mp3', title: 'Does It Matter To Matter' },
            { src: 'https://cdn1.suno.ai/a5a8c49a-6871-40b6-9054-36c81ed8be90.mp3', title: 'Pastor or Hustler' },
            { src: 'https://cdn1.suno.ai/7356371a-b8f7-470a-87a3-dbe5c2916f72.mp3', title: 'Fore-runner’s Map' },
            { src: 'https://cdn1.suno.ai/5ad4f8bc-4cef-4ad4-b847-c4f1b8147445.mp3', title: 'No Look Down' },
            { src: 'https://cdn1.suno.ai/4f81332a-d833-4dc9-9763-7db0dfde3610.mp3', title: "Wonder's Breeze" },
            { src: 'https://cdn1.suno.ai/7578528b-34c1-492c-9e97-df93216f0cc2.mp3', title: 'Covenant Of Isolation' },
            { src: 'https://cdn1.suno.ai/57a24cc6-ab05-447a-91ab-008321e9fc6a.mp3', title: 'Ghostwriter' },
            { src: 'https://cdn1.suno.ai/c84b1a3e-b364-41d3-be5f-8e3b2273eb96.mp3', title: 'A Wa Good Gan' },
            { src: 'https://cdn1.suno.ai/ce45202a-56e3-4d86-b185-3aa741aac131.mp3', title: 'Stir Am Well' },
            { src: 'https://cdn1.suno.ai/d58c70e0-b330-4cda-8ee5-afd65f874d39.mp3', title: 'Talk Wey Bend (Obfuscation)' },
            { src: 'https://cdn1.suno.ai/dbb44f28-64a1-49bb-bcbf-b5460c29ccd4.mp3', title: 'Belong Wahala' },
            { src: 'https://cdn1.suno.ai/19c15d58-c776-4f1c-9ef7-3bb7890b26bb.mp3', title: 'Habatically' },
            { src: 'https://cdn1.suno.ai/c6bb53b4-def2-4a68-bfaf-35f7f6dd7810.mp3', title: 'Party No Go Stop (Instrumental)' },
            { src: `${BASE_URL}Blood%20On%20The%20Lithium.mp3`, title: 'Blood On The Lithium' },
            { src: `${BASE_URL}No%20Be%20My%20Story.mp3`, title: 'No Be My Story' },
            { src: `${BASE_URL}Na%20We%20Dey.mp3`, title: 'Na We Dey' },
            { src: 'https://cdn1.suno.ai/e70059ca-398f-481e-9a71-6338fcfb9a1d.mp3', title: 'The Distance' },
            { src: 'https://cdn1.suno.ai/ab26a763-cba1-4426-9bf0-8117d0602684.mp3', title: 'Stand With Truth' }
        ]
      },
    ];

// Shuffle albums so they appear in a random order on each page load
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
shuffle(albums);

// Add LRC lyric file paths for each track
albums.forEach(album => {
  album.tracks.forEach(track => {
    track.lrc = track.src.replace(/\.mp3$/, '.lrc');
  });
});

    const radioStations = [
      { name: "Agidigbo 88.7 FM", location: "Ibadan", url: "https://agidigbostream.com.ng/radio/8000/radio.mp3", logo: `${BASE_URL}Logo.jpg` },
      { name: "Nigeria Info FM", location: "Lagos", url: "https://nigeriainfofmlagos993-atunwadigital.streamguys1.com/nigeriainfofmlagos993", logo: `${BASE_URL}Logo.jpg` },
      { name: "Radio Lagos FM", location: "Lagos", url: "https://servoserver.com.ng/ekofmradiolagos/stream/1/live.mp3", logo: `${BASE_URL}Logo.jpg` },
      { name: "Brilla FM", location: "Lagos", url: "https://ice31.securenetsystems.net/BRILAMP3", logo: `${BASE_URL}Logo.jpg` },
      { name: "Vision FM", location: "Kaduna", url: "https://stream-172.zeno.fm/92mxpb1akhruv?zt=eyJhbGciOiJIUzI1NiJ9.eyJzdHJlYW0iOiI5Mm14cGIxYWtocnV2IiwiaG9zdCI6InN0cmVhbS0xNzIuemVuby5fbSIsInJ0dGwiOjUsImp0aSI6ImV5OWlMMlhEU1JLMHNyYnd0b3F4ckEiLCJpYXQiOjE3NDM5MTU4MzgsImV4cCI6MTc0MzkxNTg5OH0.5sHfe_ukTnT2Fdiy83NdYdU0da51JkZXBgFoJVhg8_I", logo: `${BASE_URL}Logo.jpg` },
      { name: "Fad FM", location: "Calabar", url: "https://radio.gotright.net/listen/fadfm/radio.mp3", logo: `${BASE_URL}Logo.jpg` },
      { name: "JMPBliss Radio", location: "Ibadan", url: "https://stream-173.zeno.fm/ty5h0ecgka0uv?zt=eyJhbGciOiJIUzI1NiJ9.eyJzdHJlYW0iOiJ0eTVoMGVjZ2thMHV2IiwiaG9zdCI6InN0cmVhbS0xNzMuemVuby5mbSIsInJ0dGwiOjUsImp0aSI6InlRa2VIcE9aUV9TT2ZsZDJkWFhLZkEiLCJpYXQiOjE3NDQyMjQ1MjIsImV4cCI6MTc0NDIyNDU4Mn0.NE7xZDe19EjzpWN02xkt9XnorWH8FNdswwHdiih4dUI", logo: `${BASE_URL}Logo.jpg` },
      { name: "Wazobia FM", location: "Lagos", url: "https://wazobiafmlagos951-atunwadigital.streamguys1.com/wazobiafmlagos951", logo: `${BASE_URL}Logo.jpg` },
      { name: "Magic FM", location: "Aba", url: "https://radio.ifastekpanel.com:1565/stream", logo: `${BASE_URL}Logo.jpg` },
      { name: "Inform Me Radio", location: "Nigeria", url: "https://stream-176.zeno.fm/ta1fke6sz1zuv?zt=eyJhbGciOiJIUzI1NiJ9.eyJzdHJlYW0iOiJ0YTFma2U2c3oxenV2IiwiaG9zdCI6InN0cmVhbS0xNzYuemVuby5mbSIsInJ0dGwiOjUsImp0aSI6ImlKY0pKbmZEVHlXOWNyZzJrSHV6X3ciLCJpYXQiOjE3NDQ3Njg5MzQsImV4cCI6MTc0NDc2ODk5NH0.80dAGY0KFczNyEb83ledkuxbeTscZSLM_H9XzWDkiX4", logo: `${BASE_URL}Logo.jpg` },
      { name: "Inspiration 92.3 FM", location: "Lagos", url: "https://inspiration923fm-atunwadigital.streamguys1.com/inspiration923fm", logo: `${BASE_URL}Logo.jpg` },
      { name: "Splash FM 105.5", location: "Ibadan", url: "http://edge.mixlr.com/channel/cfeki", logo: `${BASE_URL}Logo.jpg` },
      { name: "The Beat 99.9 FM", location: "Lagos", url: "http://beatfmlagos.atunwadigital.streamguys1.com/beatfmlagos", logo: `${BASE_URL}Logo.jpg` },
      { name: "Fresh 107.9 FM", location: "Abeokuta", url: "https://stream-144.zeno.fm/7gs2681gqeruv?zt=eyJhbGciOiJIUzI1NiJ9.eyJzdHJlYW0iOiI3Z3MyNjgxZ3FlcnV2IiwiaG9zdCI6InN0cmVhbS0xNDQuemVuby5fbSIsInJ0dGwiOjUsImp0aSI6Im5nQmJkeTBjU3QtSlhMeG5QczVMUUEiLCJpYXQiOjE3NDM5MTMxNTksImV4cCI6MTc0MzkxMzIxOX0.bBtX4N1gdSrYDAPnoVAvA_OR42oPE3ceaGueOZW5dkg", logo: `${BASE_URL}Logo.jpg` },
      { name: "Faaji 106.5 FM", location: "Lagos", url: "http://streaming.faajifmradio.com:8000/faaji", logo: `${BASE_URL}Logo.jpg` },
      { name: "EgbaAlake Radio", location: "Attleboro Falls, USA", url: "https://centova47.instainternet.com/proxy/egbaalak?mp=/stream", logo: `${BASE_URL}Logo.jpg` },
      { name: "Ray Power FM", location: "Abuja", url: "https://streamlive2.hearthis.at:8080/9065169.ogg", logo: `${BASE_URL}Logo.jpg` },
      { name: "Jay 101.9 FM", location: "Jos", url: "https://stream2.rcast.net/69640/", logo: `${BASE_URL}Logo.jpg` },
      { name: "Apostolic Flame Radio", location: "Ibadan", url: "https://hoth.alonhosting.com:1695/stream", logo: `${BASE_URL}Logo.jpg` },
      { name: "FRCN Lagos Metro FM", location: "Abuja", url: "http://go.webgateready.com:7668/;", logo: `${BASE_URL}Logo.jpg` },
      { name: "Radio Nigeria", location: "Abuja", url: "https://stream.radionigeria.gov.ng/live", logo: `${BASE_URL}Logo.jpg` },
      { name: "NBS Solid 97.1 FM", location: "Nassarawa", url: "https://nbsradio1.radioca.st/;", logo: `${BASE_URL}Logo.jpg` },
      { name: "Vision Africa Radio", location: "Abia", url: "https://xstreamer.galcom.org:8443/VisionAfrica", logo: `${BASE_URL}Logo.jpg` },
      { name: "ITMP Radio", location: "Florida", url: "http://uk4freenew.listen2myradio.com:32739/stream", logo: `${BASE_URL}Logo.jpg` },
      { name: "Crest 106.1 FM", location: "Ondo", url: "https://stream-154.zeno.fm/9cgtkwg3teruv?zt=eyJhbGciOiJIUzI1NiJ9.eyJzdHJlYW0iOiI5Y2d0a3dnM3RlcnV2IiwiaG9zdCI6InN0cmVhbS0xNTQuemVuby5fbSIsInJ0dGwiOjUsImp0aSI6IlI4MXQzdjhRUWhDQWdkODRsaWJtckEiLCJpYXQiOjE3NDM5MTI3NzQsImV4cCI6MTc0MzkxMjgzNH0.QiIm090_iZfI55MZu7WqKjm5inX-mmKanKQgGBBbA7w", logo: `${BASE_URL}Logo.jpg` },
      { name: "Eko FM", location: "Lagos", url: "https://servoserver.com.ng/ekofmradiolagos/stream/1/live.mp3", logo: `${BASE_URL}Logo.jpg` },
      { name: "Liveway Radio Network FM", location: "Lagos", url: "https://stream-173.zeno.fm/qc43ktn6n0quv?zt=eyJhbGciOiJIUzI1NiJ9.eyJzdHJlYW0iOiJxYzQza3RuNm4wcXV2IiwiaG9zdCI6InN0cmVhbS0xNzMuemVuby5fbSIsInJ0dGwiOjUsImp0aSI6ImMtb0ZiQ3dtVE1hZUlEVU5YQ3BiVUEiLCJpYXQiOjE3NDM5MTMyODcsImV4cCI6MTc0MzkxMzM0N30.HVLieksgqvV_vsqRr9_rcDexkz6Lqeqeu7stKvuJr10", logo: `${BASE_URL}Logo.jpg` },
      { name: "Radio Space FM", location: "Ibadan", url: "https://stream-175.zeno.fm/79hmhafteg0uv?zt=eyJhbGciOiJIUzI1NiJ9.eyJzdHJlYW0iOiI3OWhtaGFmdGVnMHV2IiwiaG9zdCI6InN0cmVhbS0xNzUuemVuby5fbSIsInJ0dGwiOjUsImp0aSI6IkFqako3a0doUllPcVB1cmY3RDJmN2ciLCJpYXQiOjE3NDM5MTM0NzUsImV4cCI6MTc0MzkxMzUzNX0.Ow_YytmLcyURU6d_ji4EvQ-4YuLvJjXATerfWMHO67o", logo: `${BASE_URL}Logo.jpg` },
      { name: "Comfort 95.1 FM", location: "Uyo", url: "https://a3.asurahosting.com:7770/radio.mp3", logo: `${BASE_URL}Logo.jpg` },
      { name: "AKBC Akwa Ibom Radio", location: "Uyo", url: "https://stream-175.zeno.fm/2ttc8yl6giztv?zt=eyJhbGciOiJIUzI1NiJ9.eyJzdHJlYW0iOiIydHRjOHlsNmdpenR2IiwiaG9zdCI6InN0cmVhbS0xNzUuemVuby5fbSIsInJ0dGwiOjUsImp0aSI6IlE5VFpTRXpOUzFTMVlHSHdxaW5sQWciLCJpYXQiOjE3NDM5MTM3NjgsImV4cCI6MTc0MzkxMzgyOH0.9X5nRAtcN_4Pv-z5uE6ukYrNEIcwW0gHTVuYUlxVCj4", logo: `${BASE_URL}Logo.jpg` },
      { name: "Amen Radio", location: "Lagos", url: "https://eu3.fastcast4u.com/proxy/amenradi?mp=/stream", logo: `${BASE_URL}Logo.jpg` },
      { name: "Apala Radio", location: "Ibadan", url: "https://stream-172.zeno.fm/fqcszwwxra0uv?zt=eyJhbGciOiJIUzI1NiJ9.eyJzdHJlYW0iOiJmcWNzend3eHJhMHV2IiwiaG9zdCI6InN0cmVhbS0xNzIuemVuby5mbSIsInJ0dGwiOjUsImp0aSI6IjMtaGJNc2Z6UU82U1VKWlNHbExkcFEiLCJpYXQiOjE3NDQyMjUzMDYsImV4cCI6MTc0NDIyNTM2Nn0.wncuUShs9-mnbAj3ndGGS9qd1z6AHtBzJEgT9b7NZDY", logo: `${BASE_URL}Logo.jpg` },
      { name: "WFM 91.77 Women Radio", location: "Lagos", url: "https://s28.myradiostream.com:11618/listen.mp3", logo: `${BASE_URL}Logo.jpg` },
      { name: "RFI Haoussa", location: "Nigeria", url: "https://rfihaoussa96k.ice.infomaniak.ch/rfihaoussa-96k.mp3", logo: `${BASE_URL}Logo.jpg` },
      { name: "Tungba FM", location: "Lagos", url: "https://stream-173.zeno.fm/3vd633m7ctzuv?zt=eyJhbGciOiJIUzI1NiJ9.eyJzdHJlYW0iOiIzdmQ2MzNtN2N0enV2IiwiaG9zdCI6InN0cmVhbS0xNzMuemVuby5fbSIsInJ0dGwiOjUsImp0aSI6Im9QY19lN292UWFLdGUxSjFuNTI3M2ciLCJpYXQiOjE3NDM5MTQ0OTEsImV4cCI6MTc0MzkxNDU1MX0.UvA6Q0NuULFeRcHvqPJ9d68DeWz-0agoUBi8GDQWN0E", logo: `${BASE_URL}Logo.jpg` },
      { name: "Siren Songs", location: "Belgium", url: "https://sirensongs-mynoise.radioca.st/live", logo: `${BASE_URL}Logo.jpg` },
      { name: "Radio Relax", location: "Ukraine", url: "https://online.radiorelax.ua/RadioRelax_Instrumental_HD", logo: `${BASE_URL}Logo.jpg` },
      { name: "Exclusively Kenny G", location: "Dubai", url: "https://2.mystreaming.net/er/kennyg/icecast.audio", logo: `${BASE_URL}Logo.jpg` },
      { name: "Exclusively Jim Reeves", location: "Dubai", url: "https://nl4.mystreaming.net/er/jimreeves/icecast.audio", logo: `${BASE_URL}Logo.jpg` },
      { name: "247 Praise Radio", location: "Jacksonville, Florida", url: "https://streaming.radio.co/s6da23ac69/listen", logo: `${BASE_URL}Logo.jpg` },
      { name: "NPR News", location: "Washington DC", url: "https://npr-ice.streamguys1.com/live.mp3", logo: `${BASE_URL}Logo.jpg` },
      { name: "Al Jazeera", location: "Qatar", url: "https://live-hls-audio-web-aje.getaj.net/VOICE-AJE/01.m3u8", logo: `${BASE_URL}Logo.jpg` },
      { name: "CNN International", location: "Atlanta", url: "https://tunein.cdnstream1.com/3519_96.aac", logo: `${BASE_URL}Logo.jpg` },
      { name: "BBC World Service", location: "London", url: "https://utulsa.streamguys1.com/KWGSHD3-MP3", logo: `${BASE_URL}Logo.jpg` },
      { name: "BBC World Service", location: "West Africa", url: "https://stream.live.vc.bbcmedia.co.uk/bbc_world_service_west_africa", logo: `${BASE_URL}Logo.jpg` },
      { name: "BBC World Service", location: "South Asia", url: "https://stream.live.vc.bbcmedia.co.uk/bbc_world_service_south_asia", logo: `${BASE_URL}Logo.jpg` },
      { name: "BBC World Service", location: "Vermont", url: "https://vprbbc.streamguys1.com/vprbbc24.mp3", logo: `${BASE_URL}Logo.jpg` },
      { name: "Capital FM", location: "London", url: "https://media-ssl.musicradio.com/CapitalMP3", logo: `${BASE_URL}Logo.jpg` },
      { name: "WNYC", location: "New York", url: "https://fm939.wnyc.org/wnycfm-tunein", logo: `${BASE_URL}Logo.jpg` },
      { name: "RTE Radio 1", location: "Dublin", url: "https://icecast.rte.ie/radio1", logo: `${BASE_URL}Logo.jpg` },
      { name: "Virgin Radio UK", location: "London", url: "https://radio.virginradio.co.uk/stream", logo: `${BASE_URL}Logo.jpg` },
      { name: "WBEZ", location: "Chicago", url: "http://wbez.streamguys1.com/wbez128.mp3", logo: `${BASE_URL}Logo.jpg` },
      { name: "Talk Sport", location: "London", url: "https://radio.talksport.com/stream", logo: `${BASE_URL}Logo.jpg` },
      { name: "Talk Sport 2", location: "London", url: "https://radio.talksport.com/stream2", logo: `${BASE_URL}Logo.jpg` },
      { name: "Joy FM", location: "Accra", url: "http://provisioning.streamtheworld.com/pls/JOY_FM.pls", logo: `${BASE_URL}Logo.jpg` },
      { name: "UBC Radio", location: "Kampala", url: "https://stream.ubc.go.ug/ubcradio", logo: `${BASE_URL}Logo.jpg` },
      { name: "Metro FM", location: "Johannesburg", url: "https://playerservices.streamtheworld.com/api/livestream-redirect/METRO_FM.mp3", logo: `${BASE_URL}Logo.jpg` },
      { name: "Black Information Network", location: "USA", url: "https://cloud.revma.ihrhls.com/zc8729?rj-org=n2db-e2&rj-ttl=5&rj-tok=AAABlmL2wq8ALLTq8zLJ1wWRdw", logo: `${BASE_URL}Logo.jpg` },
      { name: "947", location: "Johannesburg", url: "https://playerservices.streamtheworld.com/api/livestream-redirect/FM947.mp3", logo: `${BASE_URL}Logo.jpg` },
      { name: "SAfm (SABC News & Talk)", location: "South Africa", url: "https://playerservices.streamtheworld.com/api/livestream-redirect/SAFM.mp3", logo: `${BASE_URL}Logo.jpg` }
    ];
