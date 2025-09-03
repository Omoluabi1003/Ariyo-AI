document.addEventListener('DOMContentLoaded', () => {
  const allImages = [
    'Naija AI1.png',
    'Naija AI2.png',
    'Naija AI3.png',
    'Naija AI4.png',
    'Naija AI5.png',
    'Naija AI6.png'
  ];

  // Select three random images on each load
  const images = allImages
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  // Preload images to avoid flashes during transitions
  images.forEach(src => {
    const img = new Image();
    img.src = src;
  });

  const bg1 = document.getElementById('bg1');
  const bg2 = document.getElementById('bg2');
  if (!bg1 || !bg2) return; // Only run on pages with the background container

  const layers = [bg1, bg2];
  let activeIndex = 0; // index of currently visible layer
  let imageIndex = 0;  // index in images array

  // Initialize first image
  layers[activeIndex].style.backgroundImage = `url('${images[imageIndex]}')`;
  layers[activeIndex].style.opacity = 1;

  function switchBackground() {
    // Next image index
    imageIndex = (imageIndex + 1) % images.length;
    const nextLayerIndex = 1 - activeIndex;
    const nextLayer = layers[nextLayerIndex];
    const currentLayer = layers[activeIndex];

    // Set next image and trigger cross fade
    nextLayer.style.backgroundImage = `url('${images[imageIndex]}')`;
    nextLayer.style.opacity = 1;
    currentLayer.style.opacity = 0;

    // Swap active layer
    activeIndex = nextLayerIndex;
  }

  // Change background every 2 minutes
  setInterval(switchBackground, 120000);
});

