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
  let current = 0;

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

  function changeBackground() {
    current = (current + 1) % images.length;
    document.body.style.backgroundImage = `url('${images[current]}')`;
    scheduleNextChange();
  }

  // Set initial background and start rotation
  document.body.style.backgroundImage = `url('${images[current]}')`;
  scheduleNextChange();
});
