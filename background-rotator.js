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
  function changeBackground() {
    document.body.style.backgroundImage = `url('${images[current]}')`;
    current = (current + 1) % images.length;
  }
  changeBackground();
  setInterval(changeBackground, 10000);
});
