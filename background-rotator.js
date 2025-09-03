// Rotates background images for index and main pages
// Images are located in the project root

document.addEventListener('DOMContentLoaded', () => {
  const images = [
    'Naija AI.jpg',
    'Naija AI2.jpg',
    'Naija AI3.jpg',
    'Naija AI4.png',
    'Naija AI5.png',
    'Naija AI6.png'
  ];
  const positions = {
    'Naija AI4.png': 'center 20%',
    'Naija AI5.png': 'center 20%',
    'Naija AI6.png': 'center 20%'
  };
  let current = 0;

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // Shuffle images to avoid a definite order
  shuffleArray(images);

  // Preload images to avoid flashes between transitions
  images.forEach(src => {
    const img = new Image();
    img.src = src;
  });

  function scheduleNextChange() {
    // Randomly change background every 30-40 seconds
    const delay = 30000 + Math.random() * 10000;
    setTimeout(changeBackground, delay);
  }

  function applyBackground() {
    const currentImage = images[current];
    document.body.style.backgroundImage = `url('${currentImage}')`;
    document.body.style.backgroundRepeat = 'no-repeat';
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition =
      positions[currentImage] || 'center center';
  }

  function changeBackground() {
    current = (current + 1) % images.length;
    if (current === 0) {
      shuffleArray(images);
    }
    applyBackground();
    scheduleNextChange();
  }

  // Set initial background and start rotation
  applyBackground();
  scheduleNextChange();
});
