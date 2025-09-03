// Rotates background images for index and main pages
// Images are located in the project root

document.addEventListener('DOMContentLoaded', () => {
  // List of background images. Images will be shuffled so the
  // rotation order is different on every page load.
  const images = [
    { src: 'Naija AI1.png' },
    { src: 'Naija AI2.png' },
    { src: 'Naija AI3.png' },
    { src: 'Naija AI4.png' },
    { src: 'Naija AI5.png' },
    { src: 'Naija AI6.png' }
  ];

  // Optional custom positions for specific images
  const positions = {
    'Naija AI4.png': 'center 20%',
    'Naija AI5.png': 'center 20%',
    'Naija AI6.png': 'center 20%'
  };

  let current = 0;

  // Two overlaying layers are used so that the current background can
  // fade away and reveal the next image without any flashes in between.
  let activeLayer = 0;
  const layers = [document.createElement('div'), document.createElement('div')];
  layers.forEach((layer, index) => {
    layer.className = 'background-layer';
    layer.style.zIndex = index === activeLayer ? '-1' : '-2';
    document.body.appendChild(layer);
  });

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // Preload images and keep references so they stay in memory. This
  // prevents the browser from showing a white flash while it waits for
  // the next background image to download.
  images.forEach(image => {
    const img = new Image();
    img.src = image.src;
    image.img = img;
  });

  // Shuffle images to avoid a definite order
  shuffleArray(images);

  function scheduleNextChange() {
    // Randomly change background every 30-40 seconds
    const delay = 30000 + Math.random() * 10000;
    setTimeout(changeBackground, delay);
  }

  function applyBackground() {
    const imgInfo = images[current];
    const layer = layers[activeLayer];
    layer.style.backgroundImage = `url('${imgInfo.img.src}')`;
    layer.style.backgroundPosition = positions[imgInfo.src] || 'center center';
    layer.style.opacity = '1';
    layers[1 - activeLayer].style.opacity = '0';
  }

  function changeBackground() {
    const nextIndex = (current + 1) % images.length;
    const nextInfo = images[nextIndex];

    const setBackground = () => {
      const topLayer = layers[activeLayer];
      const bottomLayer = layers[1 - activeLayer];

      // Prepare the next image on the bottom layer and show it instantly
      bottomLayer.style.transition = 'none';
      bottomLayer.style.backgroundImage = `url('${nextInfo.img.src}')`;
      bottomLayer.style.backgroundPosition = positions[nextInfo.src] || 'center center';
      bottomLayer.style.opacity = '1';
      bottomLayer.offsetHeight; // force reflow
      bottomLayer.style.transition = '';

      // Fade out the current top layer to reveal the next image
      requestAnimationFrame(() => {
        topLayer.style.opacity = '0';
        topLayer.addEventListener('transitionend', () => {
          bottomLayer.style.zIndex = '-1';
          topLayer.style.zIndex = '-2';

          activeLayer = 1 - activeLayer;
          current = nextIndex;
          if (current === 0) {
            shuffleArray(images);
          }
          scheduleNextChange();
        }, { once: true });
      });
    };

    if (nextInfo.img.complete) {
      setBackground();
    } else {
      nextInfo.img.onload = setBackground;
    }
  }

  // Set the initial background once the first image has loaded and
  // start the rotation schedule.
  const firstImage = images[0].img;
  if (firstImage.complete) {
    applyBackground();
    scheduleNextChange();
  } else {
    firstImage.onload = () => {
      applyBackground();
      scheduleNextChange();
    };
  }
});
