import './style.css';
import * as THREE from 'three';
import { gsap } from 'gsap';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 25;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.querySelector('#app').appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// Background - Cosmic stars
const starsGeometry = new THREE.BufferGeometry();
const starsMaterial = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 0.1,
  transparent: true,
  opacity: 0.8
});

const starsVertices = [];
for (let i = 0; i < 1000; i++) {
  const x = (Math.random() - 0.5) * 100;
  const y = (Math.random() - 0.5) * 100;
  const z = (Math.random() - 0.5) * 100;
  starsVertices.push(x, y, z);
}

starsGeometry.setAttribute(
  'position',
  new THREE.Float32BufferAttribute(starsVertices, 3)
);
const stars = new THREE.Points(starsGeometry, starsMaterial);
scene.add(stars);

// Core Group - Main container for all panels
const coreGroup = new THREE.Group();
scene.add(coreGroup);

// Fibonacci Sphere algorithm for even distribution
function fibonacciSphere(samples) {
  const points = [];
  const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle

  for (let i = 0; i < samples; i++) {
    const y = 1 - (i / (samples - 1)) * 2; // y goes from 1 to -1
    const radius = Math.sqrt(1 - y * y);
    const theta = phi * i;

    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;

    points.push({ x, y, z });
  }

  return points;
}

// Create video texture function with unique colors
function createVideoTexture(index) {
  // Color palette for different creators
  const colors = [
    ['#667eea', '#764ba2'], // Purple
    ['#f093fb', '#f5576c'], // Pink
    ['#4facfe', '#00f2fe'], // Blue
    ['#43e97b', '#38f9d7'], // Green
    ['#fa709a', '#fee140'], // Orange-Pink
    ['#30cfd0', '#330867'], // Teal-Purple
    ['#a8edea', '#fed6e3'], // Light Blue-Pink
    ['#ff9a9e', '#fecfef'], // Light Pink
    ['#ffecd2', '#fcb69f'], // Peach
    ['#ff6e7f', '#bfe9ff'], // Red-Blue
    ['#e0c3fc', '#8ec5fc'], // Lavender-Blue
    ['#f093fb', '#f5576c'], // Pink-Red
    ['#fdfbfb', '#ebedee'], // Light Gray
    ['#4facfe', '#00f2fe'], // Cyan
    ['#43e97b', '#38f9d7'], // Mint
    ['#fa709a', '#fee140'], // Coral
    ['#30cfd0', '#330867'], // Dark Teal
    ['#a8edea', '#fed6e3'], // Pastel
    ['#ff9a9e', '#fad0c4'], // Rose
    ['#ffecd2', '#fcb69f']  // Warm
  ];
  
  const colorPair = colors[index % colors.length];
  
  // Create canvas as fallback
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 1280;
  const ctx = canvas.getContext('2d');
  
  // Create gradient background
  const gradient = ctx.createLinearGradient(0, 0, 0, 1280);
  gradient.addColorStop(0, colorPair[0]);
  gradient.addColorStop(1, colorPair[1]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 720, 1280);
  
  // Add decorative elements
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * 720, Math.random() * 1280, 50 + Math.random() * 100, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Add text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 70px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('AI Creator', 360, 580);
  ctx.font = '40px Arial';
  ctx.fillText(`#${index + 1}`, 360, 700);
  
  // Try to load video
  const video = document.createElement('video');
  video.src = '/preview.mp4';
  video.crossOrigin = 'anonymous';
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  
  let useCanvas = false;
  
  // Attempt to play video
  video.play().catch(() => {
    useCanvas = true;
  });
  
  // Check after a short delay if video loaded
  setTimeout(() => {
    if (video.readyState < 2) {
      useCanvas = true;
    }
  }, 100);
  
  // Use canvas texture for now (video fallback logic)
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  
  return texture;
}

// Create 20 panels
const panels = [];
const sphereRadius = 10;
const panelPositions = fibonacciSphere(20);

panelPositions.forEach((pos, index) => {
  // Panel geometry - vertical format (4x5)
  const geometry = new THREE.PlaneGeometry(4, 5);
  
  // Create material with video texture
  const texture = createVideoTexture(index);
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    side: THREE.DoubleSide,
    emissive: 0x222222,
    emissiveIntensity: 0.2,
    transparent: true,
    opacity: 1
  });
  
  const panel = new THREE.Mesh(geometry, material);
  
  // Position on sphere
  panel.position.set(
    pos.x * sphereRadius,
    pos.y * sphereRadius,
    pos.z * sphereRadius
  );
  
  // Make panel face outward from center
  panel.lookAt(0, 0, 0);
  panel.rotateY(Math.PI); // Flip to face outward
  
  // Store original data
  panel.userData = {
    id: index,
    originalScale: 1,
    selected: false
  };
  
  coreGroup.add(panel);
  panels.push(panel);
});

// Custom rotation controls
class RotationControls {
  constructor(object, domElement) {
    this.object = object;
    this.domElement = domElement;
    
    this.isRotating = false;
    this.previousMousePosition = { x: 0, y: 0 };
    this.rotationVelocity = { x: 0, y: 0 };
    this.dampingFactor = 0.95;
    
    this.enabled = true;
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Mouse events
    this.domElement.addEventListener('mousedown', (e) => this.onPointerDown(e));
    this.domElement.addEventListener('mousemove', (e) => this.onPointerMove(e));
    this.domElement.addEventListener('mouseup', () => this.onPointerUp());
    this.domElement.addEventListener('mouseleave', () => this.onPointerUp());
    
    // Touch events for mobile
    this.domElement.addEventListener('touchstart', (e) => this.onPointerDown(e.touches[0]));
    this.domElement.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this.onPointerMove(e.touches[0]);
    }, { passive: false });
    this.domElement.addEventListener('touchend', () => this.onPointerUp());
  }
  
  onPointerDown(event) {
    if (!this.enabled) return;
    
    this.isRotating = true;
    this.previousMousePosition = {
      x: event.clientX,
      y: event.clientY
    };
    
    // Stop any existing velocity
    this.rotationVelocity = { x: 0, y: 0 };
  }
  
  onPointerMove(event) {
    if (!this.isRotating || !this.enabled) return;
    
    const deltaX = event.clientX - this.previousMousePosition.x;
    const deltaY = event.clientY - this.previousMousePosition.y;
    
    // Apply rotation
    const rotationSpeed = 0.005;
    this.object.rotation.y += deltaX * rotationSpeed;
    this.object.rotation.x += deltaY * rotationSpeed;
    
    // Store velocity for inertia
    this.rotationVelocity.x = deltaY * rotationSpeed;
    this.rotationVelocity.y = deltaX * rotationSpeed;
    
    this.previousMousePosition = {
      x: event.clientX,
      y: event.clientY
    };
  }
  
  onPointerUp() {
    this.isRotating = false;
  }
  
  update() {
    if (!this.isRotating && this.enabled) {
      // Apply inertia
      this.object.rotation.x += this.rotationVelocity.x;
      this.object.rotation.y += this.rotationVelocity.y;
      
      // Damping
      this.rotationVelocity.x *= this.dampingFactor;
      this.rotationVelocity.y *= this.dampingFactor;
      
      // Stop when velocity is very low
      if (Math.abs(this.rotationVelocity.x) < 0.0001) this.rotationVelocity.x = 0;
      if (Math.abs(this.rotationVelocity.y) < 0.0001) this.rotationVelocity.y = 0;
    }
  }
}

const controls = new RotationControls(coreGroup, renderer.domElement);

// Raycasting for selection
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedPanel = null;

function onPanelClick(event) {
  // Calculate mouse position in normalized device coordinates
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
  // Update the picking ray
  raycaster.setFromCamera(mouse, camera);
  
  // Calculate intersections
  const intersects = raycaster.intersectObjects(panels);
  
  if (intersects.length > 0) {
    const clickedPanel = intersects[0].object;
    
    // Prevent multiple clicks during animation
    if (!controls.enabled) return;
    
    console.log(`Selected Creator ID: ${clickedPanel.userData.id}`);
    
    // Deselect previous panel
    if (selectedPanel && selectedPanel !== clickedPanel) {
      gsap.to(selectedPanel.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.5,
        ease: 'power2.out'
      });
      gsap.to(selectedPanel.material, {
        opacity: 1,
        duration: 0.5
      });
    }
    
    // Select new panel
    selectedPanel = clickedPanel;
    
    // Scale up selected panel
    gsap.to(clickedPanel.scale, {
      x: 1.2,
      y: 1.2,
      z: 1.2,
      duration: 0.5,
      ease: 'power2.out'
    });
    
    // Dim other panels
    panels.forEach(panel => {
      if (panel !== clickedPanel) {
        gsap.to(panel.material, {
          opacity: 0.4,
          duration: 0.5
        });
      }
    });
    
    // Disable rotation during focus animation
    controls.enabled = false;
    
    // Calculate rotation needed to center the panel
    const panelWorldPosition = new THREE.Vector3();
    clickedPanel.getWorldPosition(panelWorldPosition);
    
    // Get current rotation
    const currentRotation = {
      x: coreGroup.rotation.x,
      y: coreGroup.rotation.y
    };
    
    // Calculate target rotation (simplified - rotate to face camera)
    const targetY = Math.atan2(panelWorldPosition.x, panelWorldPosition.z);
    const targetX = -Math.atan2(panelWorldPosition.y, 
      Math.sqrt(panelWorldPosition.x ** 2 + panelWorldPosition.z ** 2));
    
    // Animate rotation to center the panel
    gsap.to(coreGroup.rotation, {
      x: targetX,
      y: targetY,
      duration: 1.5,
      ease: 'power2.inOut',
      onComplete: () => {
        // Re-enable rotation after animation
        controls.enabled = true;
      }
    });
  }
}

// Add click listener
renderer.domElement.addEventListener('click', onPanelClick);

// Touch support for mobile
renderer.domElement.addEventListener('touchend', (event) => {
  if (event.changedTouches.length > 0) {
    onPanelClick(event.changedTouches[0]);
  }
});

// Handle window resize
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', onWindowResize);

// Hide loading indicator once ready
setTimeout(() => {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.style.transition = 'opacity 0.5s';
    loading.style.opacity = '0';
    setTimeout(() => loading.remove(), 500);
  }
}, 500);

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  
  // Update controls (apply inertia)
  controls.update();
  
  // Slowly rotate stars for depth effect
  stars.rotation.y += 0.0001;
  
  renderer.render(scene, camera);
}

animate();
