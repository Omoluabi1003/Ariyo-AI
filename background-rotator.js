// Displays a single background image for index and main pages.
// The image changes monthly, cycling through six options.

document.addEventListener('DOMContentLoaded', () => {
  const images = [
    'Naija AI1.png',
    'Naija AI2.png',
    'Naija AI3.png',
    'Naija AI4.png',
    'Naija AI5.png',
    'Naija AI6.png'
  ];

  const positions = {
    'Naija AI4.png': 'center 20%',
    'Naija AI5.png': 'center 20%',
    'Naija AI6.png': 'center 20%'
  };

  const month = new Date().getMonth();
  const selectedImage = images[month % images.length];

  const layer = document.createElement('div');
  layer.className = 'background-layer';
  layer.style.backgroundImage = `url('${selectedImage}')`;
  layer.style.backgroundPosition = positions[selectedImage] || 'center center';
  layer.style.opacity = '1';

  document.body.prepend(layer);
});
