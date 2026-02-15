import './style.css';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 7;

const renderer = new THREE.WebGLRenderer({ 
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.querySelector('#app').appendChild(renderer.domElement);

// Post-processing
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.3,  // strength
  0.4,  // radius
  0.85  // threshold
);
composer.addPass(bloomPass);

// Premium Lighting Setup
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

// Key light
const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
keyLight.position.set(10, 15, 10);
keyLight.castShadow = true;
keyLight.shadow.mapSize.width = 2048;
keyLight.shadow.mapSize.height = 2048;
scene.add(keyLight);

// Fill light
const fillLight = new THREE.DirectionalLight(0xe8e8ff, 0.6);
fillLight.position.set(-10, 5, -5);
scene.add(fillLight);

// Rim light for depth
const rimLight = new THREE.DirectionalLight(0xfff5e6, 0.8);
rimLight.position.set(0, -10, -10);
scene.add(rimLight);

// Subtle point lights for highlights
const pointLight1 = new THREE.PointLight(0x6366f1, 0.5, 30);
pointLight1.position.set(8, 8, 8);
scene.add(pointLight1);

const pointLight2 = new THREE.PointLight(0xec4899, 0.5, 30);
pointLight2.position.set(-8, -8, 8);
scene.add(pointLight2);

// Core Group - Main container for all panels
const coreGroup = new THREE.Group();
scene.add(coreGroup);

// Premium color palette - sophisticated gradients
const premiumColors = [
  ['#1a1a2e', '#16213e', '#0f3460'], // Deep Navy
  ['#2d1b69', '#574b90', '#9b89b3'], // Royal Purple  
  ['#0c0c0c', '#1c1c1c', '#2d2d2d'], // Elegant Black
  ['#1e3a5f', '#3d5a80', '#98c1d9'], // Ocean Blue
  ['#5c2751', '#912f56', '#d63864'], // Wine Red
  ['#0d1b2a', '#1b263b', '#415a77'], // Midnight
  ['#2b2d42', '#8d99ae', '#edf2f4'], // Steel Gray
];

// Create premium video texture
function createPremiumTexture(index) {
  const colorSet = premiumColors[index % premiumColors.length];
  
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 1280;
  const ctx = canvas.getContext('2d');
  
  // Multi-stop gradient for depth
  const gradient = ctx.createLinearGradient(0, 0, 720, 1280);
  gradient.addColorStop(0, colorSet[0]);
  gradient.addColorStop(0.5, colorSet[1]);
  gradient.addColorStop(1, colorSet[2]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 720, 1280);
  
  // Glossy highlight overlay
  const highlightGradient = ctx.createRadialGradient(200, 300, 0, 360, 640, 800);
  highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
  highlightGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.04)');
  highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = highlightGradient;
  ctx.fillRect(0, 0, 720, 1280);
  
  // Elegant typography
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.font = '600 56px "SF Pro Display", "Helvetica Neue", Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Add subtle text shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;
  
  ctx.fillText('CREATOR', 360, 600);
  
  ctx.font = '300 120px "SF Pro Display", "Helvetica Neue", Arial';
  ctx.fillText(`0${index + 1}`, 360, 720);
  
  // Reset shadow
  ctx.shadowColor = 'transparent';
  
  // Bottom accent line
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.fillRect(260, 850, 200, 2);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  
  return texture;
}

// Back side colors matching premium palette
const backColors = [
  0x1a1a2e, // Deep Navy
  0x2d1b69, // Royal Purple
  0x1c1c1c, // Elegant Black
  0x1e3a5f, // Ocean Blue
  0x5c2751, // Wine Red
  0x0d1b2a, // Midnight
  0x2b2d42, // Steel Gray
];

// Create 7 panels arranged in a sphere
const panels = [];
const sphereRadius = 2.2;
const numPanels = 7;

for (let i = 0; i < numPanels; i++) {
  // Distribute panels evenly around sphere using fibonacci
  const phi = Math.acos(1 - 2 * (i + 0.5) / numPanels);
  const theta = Math.PI * (1 + Math.sqrt(5)) * i;
  
  // Simple flat panel geometry
  const panelWidth = 2.2;
  const panelHeight = 3.2;
  const geometry = new THREE.PlaneGeometry(panelWidth, panelHeight);
  
  const texture = createPremiumTexture(i);
  
  // Create card group (front + back)
  const cardGroup = new THREE.Group();
  
  // Front side with texture
  const frontMaterial = new THREE.MeshPhysicalMaterial({
    map: texture,
    side: THREE.FrontSide,
    roughness: 0.2,
    metalness: 0.05,
    clearcoat: 0.5,
    clearcoatRoughness: 0.3,
    transparent: true,
    opacity: 1
  });
  const frontPanel = new THREE.Mesh(geometry, frontMaterial);
  frontPanel.castShadow = true;
  frontPanel.receiveShadow = true;
  cardGroup.add(frontPanel);
  
  // Back side - solid color
  const backMaterial = new THREE.MeshPhysicalMaterial({
    color: backColors[i % backColors.length],
    side: THREE.FrontSide,
    roughness: 0.3,
    metalness: 0.1,
    clearcoat: 0.3,
    clearcoatRoughness: 0.4
  });
  const backPanel = new THREE.Mesh(geometry.clone(), backMaterial);
  backPanel.rotation.y = Math.PI; // Flip to face opposite direction
  backPanel.position.z = -0.01; // Slight offset to avoid z-fighting
  backPanel.castShadow = true;
  backPanel.receiveShadow = true;
  cardGroup.add(backPanel);
  
  // Position on sphere surface
  const x = sphereRadius * Math.sin(phi) * Math.cos(theta);
  const y = sphereRadius * Math.cos(phi);
  const z = sphereRadius * Math.sin(phi) * Math.sin(theta);
  
  cardGroup.position.set(x, y, z);
  
  // Orient card to face outward from sphere center
  const outwardDirection = new THREE.Vector3(x, y, z).normalize().multiplyScalar(sphereRadius * 2);
  cardGroup.lookAt(outwardDirection);
  
  cardGroup.userData = {
    id: i,
    originalScale: 1,
    originalY: y,
    selected: false
  };
  
  coreGroup.add(cardGroup);
  panels.push(cardGroup);
}

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
  
  // Calculate intersections with all children recursively
  const intersects = raycaster.intersectObjects(panels, true);
  
  if (intersects.length > 0) {
    // Get the parent card group
    let clickedPanel = intersects[0].object;
    while (clickedPanel.parent && !panels.includes(clickedPanel)) {
      clickedPanel = clickedPanel.parent;
    }
    
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
      // Restore opacity on front panel
      selectedPanel.children.forEach(child => {
        if (child.material && child.material.opacity !== undefined) {
          gsap.to(child.material, { opacity: 1, duration: 0.5 });
        }
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
        panel.children.forEach(child => {
          if (child.material && child.material.opacity !== undefined) {
            gsap.to(child.material, { opacity: 0.4, duration: 0.5 });
          }
        });
      }
    });
    
    // Disable rotation during focus animation
    controls.enabled = false;
    
    // Calculate rotation needed to center the panel
    const panelWorldPosition = new THREE.Vector3();
    clickedPanel.getWorldPosition(panelWorldPosition);
    
    // Calculate target rotation to center the panel in front of camera
    const targetY = Math.atan2(panelWorldPosition.x, panelWorldPosition.z);
    const horizontalDistance = Math.sqrt(
      panelWorldPosition.x ** 2 + panelWorldPosition.z ** 2
    );
    const targetX = -Math.atan2(panelWorldPosition.y, horizontalDistance);
    
    // Animate rotation to center the panel
    gsap.to(coreGroup.rotation, {
      x: targetX,
      y: targetY,
      duration: 1.5,
      ease: 'power2.inOut',
      onComplete: () => {
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
  composer.setSize(window.innerWidth, window.innerHeight);
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

// Subtle auto-rotation for premium feel
let autoRotate = true;
const autoRotateSpeed = 0.001;

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  
  // Update controls (apply inertia)
  controls.update();
  
  // Subtle auto-rotation when not interacting
  if (autoRotate && !controls.isRotating) {
    coreGroup.rotation.y += autoRotateSpeed;
  }
  
  // Use composer for post-processing
  composer.render();
}

animate();
