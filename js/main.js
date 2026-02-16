// Animate the CIFAR profile picture
const zoomImage          = document.getElementById('profile-img');
const zoomImageContainer = document.getElementById('profile-img-container');
const spinner            = document.getElementById('spinner');
const profile            = document.getElementById('profile');

const image = new Image();
const ZOOM = 20;

image.onload = () => {
  // Hide spinner, show the image
  if (spinner) spinner.style.display = 'none';
  if (zoomImage) zoomImage.style.display = 'block';

  // Pan + zoom effect
  zoomImageContainer.addEventListener('mousemove', (e) => {
    const rect = zoomImageContainer.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;   // 0 → 1
    const relY = (e.clientY - rect.top) / rect.height;

    const moveX = (0.5 - relX) * 100;
    const moveY = (0.5 - relY) * 100;

    zoomImage.style.transformOrigin = 'center center';
    zoomImage.style.transform = `scale(${ZOOM}) translate(${moveX}%, ${moveY}%)`;
  });

  zoomImageContainer.addEventListener('mouseleave', () => {
    zoomImage.style.transform = 'scale(1) translate(0,0)';
  });

  // Make external links open in new tab safely
  document.querySelectorAll('a').forEach((link) => {
    const href = link.getAttribute('href');
    if (href && !href.startsWith('#')) {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener');
    }
  });
};

image.onerror = () => {
  if (profile) profile.style.display = 'none';
};

// Attach handlers *before* setting src
image.src = '../img/david.jpg';

// Publication toggle
const toggleSelected = document.getElementById('toggle-selected');
const toggleAll = document.getElementById('toggle-all');
const pubSection = toggleSelected.closest('.section');

toggleSelected.addEventListener('click', (e) => {
  e.preventDefault();
  pubSection.classList.remove('show-all');
  toggleSelected.classList.add('toggle-active');
  toggleAll.classList.remove('toggle-active');
});

toggleAll.addEventListener('click', (e) => {
  e.preventDefault();
  pubSection.classList.add('show-all');
  toggleAll.classList.add('toggle-active');
  toggleSelected.classList.remove('toggle-active');
});

// Lazy load teapot (at 50% scroll)
(() => {
let loaded = false;
const load = () => {
    if (!loaded) {
    loaded = true;
    Object.assign(document.body.appendChild(document.createElement('script')), {
        type: 'module',
        src: 'js/teapot.js'
    });
    }
};
const check = () => {
    if (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight) >= 0.5) {
    load();
    window.removeEventListener('scroll', check);
    }
};
window.addEventListener('scroll', check);
check();
})();