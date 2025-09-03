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

  // Two overlaying layers are used so that the next background image
  // can fade in on top of the current one. This prevents a white flash
  // from appearing between image transitions.
  const layers = [document.createElement('div'), document.createElement('div')];
  layers.forEach(layer => {
    layer.className = 'background-layer';
    document.body.appendChild(layer);
  });
  let activeLayer = 0;

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
      const hiddenLayer = layers[1 - activeLayer];
      hiddenLayer.style.backgroundImage = `url('${nextInfo.img.src}')`;
      hiddenLayer.style.backgroundPosition = positions[nextInfo.src] || 'center center';

      // Start the cross-fade on the next animation frame so the
      // browser has time to apply the new background image. This
      // prevents a momentary flash of the page's background color.
      requestAnimationFrame(() => {
        hiddenLayer.style.opacity = '1';
        layers[activeLayer].style.opacity = '0';

        activeLayer = 1 - activeLayer;
        current = nextIndex;
        if (current === 0) {
          // Reshuffle for the next cycle
          shuffleArray(images);
        }
        scheduleNextChange();
      });
    };

    // If the image has already loaded, switch immediately.
    // Otherwise wait for it to load before switching backgrounds.
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
