import './style.css';
import * as THREE from 'three';
import { gsap } from 'gsap';

// Scene setup
const scene = new THREE.Scene();

// Gray gradient background with noise
function createNoiseBackground() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d');
  
  // Radial gradient: lighter center, darker edges
  const grad = ctx.createRadialGradient(1024, 1024, 0, 1024, 1024, 1400);
  grad.addColorStop(0, '#f2f2f2');
  grad.addColorStop(0.5, '#e8e8e8');
  grad.addColorStop(1, '#d8d8d8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2048, 2048);
  
  // Noise overlay
  const imageData = ctx.getImageData(0, 0, 2048, 2048);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 12;
    data[i] += noise;
    data[i + 1] += noise;
    data[i + 2] += noise;
  }
  ctx.putImageData(imageData, 0, 0);
  
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}
scene.background = createNoiseBackground();

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 16;

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
renderer.toneMappingExposure = 0.9;
document.querySelector('#app').appendChild(renderer.domElement);

// Premium Lighting Setup
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

// Key light with shadows
const keyLight = new THREE.DirectionalLight(0xffffff, 0.5);
keyLight.position.set(8, 12, 10);
keyLight.castShadow = true;
keyLight.shadow.mapSize.width = 2048;
keyLight.shadow.mapSize.height = 2048;
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 50;
keyLight.shadow.camera.left = -15;
keyLight.shadow.camera.right = 15;
keyLight.shadow.camera.top = 15;
keyLight.shadow.camera.bottom = -15;
keyLight.shadow.bias = -0.001;
keyLight.shadow.radius = 4;
scene.add(keyLight);

// Fill light
const fillLight = new THREE.DirectionalLight(0xe8e8ff, 0.3);
fillLight.position.set(-8, 5, 5);
scene.add(fillLight);

// Rim light
const rimLight = new THREE.DirectionalLight(0xfff5e6, 0.2);
rimLight.position.set(0, -8, -8);
scene.add(rimLight);

// Environment map for reflections
const pmremGenerator = new THREE.PMREMGenerator(renderer);
const envScene = new THREE.Scene();
const envGeo = new THREE.SphereGeometry(50, 32, 32);
const envMat = new THREE.MeshBasicMaterial({
  side: THREE.BackSide,
  color: 0xffffff
});
const envMesh = new THREE.Mesh(envGeo, envMat);
envScene.add(envMesh);

const gradientLight = new THREE.HemisphereLight(0xffffff, 0xe0e5ec, 1);
envScene.add(gradientLight);

const envMap = pmremGenerator.fromScene(envScene, 0.04).texture;
scene.environment = envMap;

// Shadow plane - soft and subtle
const shadowPlaneGeo = new THREE.PlaneGeometry(50, 50);
const shadowPlaneMat = new THREE.ShadowMaterial({ 
  opacity: 0.08,
  color: 0x222222
});
const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
shadowPlane.rotation.x = -Math.PI / 2;
shadowPlane.position.y = -6;
shadowPlane.receiveShadow = true;
scene.add(shadowPlane);

// Sphere radius
const sphereRadius = 5;

// Core Group
const coreGroup = new THREE.Group();
scene.add(coreGroup);

// Inner sphere for white gaps between panels
const innerSphereGeo = new THREE.SphereGeometry(sphereRadius - 0.04, 64, 64);
const innerSphereMat = new THREE.MeshBasicMaterial({
  color: 0xe8e8e8,
  side: THREE.FrontSide
});
const innerSphere = new THREE.Mesh(innerSphereGeo, innerSphereMat);
coreGroup.add(innerSphere);

// Create spherical panel geometry - curved to wrap around sphere
function createSphericalPanelGeometry(radius, phiStart, phiLength, thetaStart, thetaLength, widthSegs = 32, heightSegs = 32) {
  const geometry = new THREE.BufferGeometry();
  
  const vertices = [];
  const uvs = [];
  const indices = [];
  const normals = [];
  
  for (let y = 0; y <= heightSegs; y++) {
    const v = y / heightSegs;
    const phi = phiStart + v * phiLength;
    
    for (let x = 0; x <= widthSegs; x++) {
      const u = x / widthSegs;
      const theta = thetaStart + u * thetaLength;
      
      const px = radius * Math.sin(phi) * Math.cos(theta);
      const py = radius * Math.cos(phi);
      const pz = radius * Math.sin(phi) * Math.sin(theta);
      
      vertices.push(px, py, pz);
      
      // Normal points outward from sphere center
      const nx = Math.sin(phi) * Math.cos(theta);
      const ny = Math.cos(phi);
      const nz = Math.sin(phi) * Math.sin(theta);
      normals.push(nx, ny, nz);
      
      uvs.push(1 - u, 1 - v);
    }
  }
  
  for (let y = 0; y < heightSegs; y++) {
    for (let x = 0; x < widthSegs; x++) {
      const a = y * (widthSegs + 1) + x;
      const b = a + 1;
      const c = a + (widthSegs + 1);
      const d = c + 1;
      
      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }
  
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  
  return geometry;
}

// Premium texture for each panel
function createPremiumTexture(index, label) {
  const premiumColors = [
    ['#1a1a2e', '#16213e', '#0f3460'],
    ['#2d1b69', '#574b90', '#9b89b3'],
    ['#0c0c0c', '#1c1c1c', '#2d2d2d'],
    ['#1e3a5f', '#3d5a80', '#98c1d9'],
    ['#5c2751', '#912f56', '#d63864'],
    ['#0d1b2a', '#1b263b', '#415a77'],
    ['#2b2d42', '#8d99ae', '#edf2f4'],
  ];
  const colorSet = premiumColors[index % premiumColors.length];
  
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  
  // Gradient background
  const gradient = ctx.createLinearGradient(0, 0, 1024, 1024);
  gradient.addColorStop(0, colorSet[0]);
  gradient.addColorStop(0.5, colorSet[1]);
  gradient.addColorStop(1, colorSet[2]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1024, 1024);
  
  // Subtle glossy highlight
  const highlightGradient = ctx.createRadialGradient(350, 350, 0, 512, 512, 700);
  highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
  highlightGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.03)');
  highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = highlightGradient;
  ctx.fillRect(0, 0, 1024, 1024);
  
  // Typography
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = '600 48px "SF Pro Display", "Helvetica Neue", Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 3;
  
  ctx.fillText('CREATOR', 512, 460);
  
  ctx.font = '200 110px "SF Pro Display", "Helvetica Neue", Arial';
  ctx.fillText('0' + (index + 1), 512, 580);
  
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.fillRect(412, 660, 200, 2);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  
  return texture;
}

// Create panels
const panels = [];
const numPanels = 7;
const gap = 0.012; // Thin gap between panels

// Layout: divide sphere into 3 rows, distribute panels to tile the whole sphere
// Row 0 (top cap): 2 panels — phi from 0 to ~pi/3
// Row 1 (middle band): 3 panels — phi from ~pi/3 to ~2pi/3
// Row 2 (bottom cap): 2 panels — phi from ~2pi/3 to pi
const rowBoundaries = [0, Math.PI * 0.33, Math.PI * 0.67, Math.PI];
const panelsPerRow = [2, 3, 2];

const panelConfigs = [];
for (let row = 0; row < 3; row++) {
  const phiStart = rowBoundaries[row] + gap;
  const phiEnd = rowBoundaries[row + 1] - gap;
  const phiLength = phiEnd - phiStart;
  const count = panelsPerRow[row];
  const thetaSize = (Math.PI * 2) / count;
  
  for (let col = 0; col < count; col++) {
    const thetaStart = col * thetaSize + gap;
    const thetaLength = thetaSize - gap * 2;
    
    panelConfigs.push({
      phiStart,
      phiLength,
      thetaStart,
      thetaLength
    });
  }
}

for (let i = 0; i < numPanels; i++) {
  const config = panelConfigs[i];
  
  const frontGeometry = createSphericalPanelGeometry(
    sphereRadius, config.phiStart, config.phiLength, config.thetaStart, config.thetaLength
  );
  
  const backGeometry = createSphericalPanelGeometry(
    sphereRadius - 0.03, config.phiStart, config.phiLength, config.thetaStart, config.thetaLength
  );
  
  const texture = createPremiumTexture(i);
  
  const cardGroup = new THREE.Group();
  
  // Front material with texture
  const frontMaterial = new THREE.MeshPhysicalMaterial({
    map: texture,
    side: THREE.FrontSide,
    roughness: 0.35,
    metalness: 0.02,
    clearcoat: 0.3,
    clearcoatRoughness: 0.4,
    envMapIntensity: 0.2,
    transparent: true,
    opacity: 1
  });
  
  const frontPanel = new THREE.Mesh(frontGeometry, frontMaterial);
  frontPanel.castShadow = true;
  frontPanel.receiveShadow = true;
  cardGroup.add(frontPanel);
  
  // Back panel (inside of sphere)
  const backMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x111111,
    side: THREE.BackSide,
    roughness: 0.5,
    metalness: 0.1
  });
  const backPanel = new THREE.Mesh(backGeometry, backMaterial);
  backPanel.castShadow = true;
  cardGroup.add(backPanel);
  
  cardGroup.userData = {
    id: i,
    originalPosition: new THREE.Vector3(0, 0, 0),
    originalRotation: new THREE.Euler(0, 0, 0),
    isHovered: false
  };
  
  coreGroup.add(cardGroup);
  panels.push(cardGroup);
}

// Random initial rotation
coreGroup.rotation.x = (Math.random() - 0.5) * 0.5;
coreGroup.rotation.y = Math.random() * Math.PI * 2;

// App state
let isDetailView = false;
let selectedPanel = null;
let mouseX = 0;
let mouseY = 0;

document.addEventListener('mousemove', (e) => {
  mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
  mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
});

// Rotation controls
class RotationControls {
  constructor(object, domElement) {
    this.object = object;
    this.domElement = domElement;
    this.isRotating = false;
    this.previousMousePosition = { x: 0, y: 0 };
    this.rotationVelocity = { x: 0, y: 0 };
    this.dampingFactor = 0.92;
    this.enabled = true;
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    this.domElement.addEventListener('mousedown', (e) => this.onPointerDown(e));
    this.domElement.addEventListener('mousemove', (e) => this.onPointerMove(e));
    this.domElement.addEventListener('mouseup', () => this.onPointerUp());
    this.domElement.addEventListener('mouseleave', () => this.onPointerUp());
    
    this.domElement.addEventListener('touchstart', (e) => this.onPointerDown(e.touches[0]));
    this.domElement.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this.onPointerMove(e.touches[0]);
    }, { passive: false });
    this.domElement.addEventListener('touchend', () => this.onPointerUp());
  }
  
  onPointerDown(event) {
    if (!this.enabled || isDetailView) return;
    this.isRotating = true;
    this.previousMousePosition = { x: event.clientX, y: event.clientY };
    this.rotationVelocity = { x: 0, y: 0 };
  }
  
  onPointerMove(event) {
    if (!this.isRotating || !this.enabled || isDetailView) return;
    
    const deltaX = event.clientX - this.previousMousePosition.x;
    const deltaY = event.clientY - this.previousMousePosition.y;
    
    const rotationSpeed = 0.004;
    this.object.rotation.y += deltaX * rotationSpeed;
    this.object.rotation.x += deltaY * rotationSpeed;
    
    this.rotationVelocity.x = deltaY * rotationSpeed;
    this.rotationVelocity.y = deltaX * rotationSpeed;
    
    this.previousMousePosition = { x: event.clientX, y: event.clientY };
  }
  
  onPointerUp() {
    this.isRotating = false;
  }
  
  update() {
    if (!this.isRotating && this.enabled && !isDetailView) {
      this.object.rotation.x += this.rotationVelocity.x;
      this.object.rotation.y += this.rotationVelocity.y;
      
      this.rotationVelocity.x *= this.dampingFactor;
      this.rotationVelocity.y *= this.dampingFactor;
      
      if (Math.abs(this.rotationVelocity.x) < 0.0001) this.rotationVelocity.x = 0;
      if (Math.abs(this.rotationVelocity.y) < 0.0001) this.rotationVelocity.y = 0;
    }
  }
}

const controls = new RotationControls(coreGroup, renderer.domElement);

// Raycasting
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let hoveredPanel = null;

// Check if front side of panel is facing camera using intersection normal
function isFrontFacing(intersect) {
  if (!intersect.face) return false;
  
  // Get face normal in world space
  const normal = intersect.face.normal.clone();
  normal.transformDirection(intersect.object.matrixWorld);
  
  // Direction from intersection point to camera
  const toCamera = new THREE.Vector3().subVectors(camera.position, intersect.point).normalize();
  
  // Strict check: dot > 0.1 to avoid edge cases
  return normal.dot(toCamera) > 0.1;
}

// Find first front-facing intersect (skip back faces and inner sphere)
function findFrontFacingIntersect(intersects) {
  for (const intersect of intersects) {
    // Skip inner sphere
    if (intersect.object === innerSphere) continue;
    
    // Skip BackSide materials
    if (intersect.object.material && intersect.object.material.side === THREE.BackSide) continue;
    
    // Check if front-facing
    if (isFrontFacing(intersect)) {
      let panel = intersect.object;
      while (panel.parent && !panels.includes(panel)) {
        panel = panel.parent;
      }
      if (panels.includes(panel)) {
        return { intersect, panel };
      }
    }
  }
  return null;
}

function onMouseMove(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
  if (isDetailView) return;
  
  raycaster.setFromCamera(mouse, camera);
  const allObjects = [...panels.flatMap(p => p.children), innerSphere];
  const intersects = raycaster.intersectObjects(allObjects, false);
  
  const hit = findFrontFacingIntersect(intersects);
  
  if (hit) {
    const panel = hit.panel;
    
    if (hoveredPanel !== panel) {
      if (hoveredPanel) {
        gsap.to(hoveredPanel.scale, { x: 1, y: 1, z: 1, duration: 0.3, ease: 'power2.out' });
        hoveredPanel.children.forEach(child => {
          if (child.material && child.material.emissive) {
            gsap.to(child.material, { emissiveIntensity: 0, duration: 0.3 });
          }
        });
        hoveredPanel.userData.isHovered = false;
      }
      
      hoveredPanel = panel;
      hoveredPanel.userData.isHovered = true;
      
      // Scale up + glow on hover
      gsap.to(panel.scale, { x: 1.04, y: 1.04, z: 1.04, duration: 0.3, ease: 'power2.out' });
      panel.children.forEach(child => {
        if (child.material && child.material.emissive) {
          child.material.emissive.set(0xffffff);
          gsap.to(child.material, { emissiveIntensity: 0.08, duration: 0.3 });
        }
      });
      
      // Dim other panels slightly
      panels.forEach(p => {
        if (p !== panel) {
          p.children.forEach(child => {
            if (child.material && child.material.transparent) {
              gsap.to(child.material, { opacity: 0.6, duration: 0.3 });
            }
          });
        }
      });
    }
    
    renderer.domElement.style.cursor = 'pointer';
  } else {
    if (hoveredPanel) {
      gsap.to(hoveredPanel.scale, { x: 1, y: 1, z: 1, duration: 0.3, ease: 'power2.out' });
      hoveredPanel.children.forEach(child => {
        if (child.material && child.material.emissive) {
          gsap.to(child.material, { emissiveIntensity: 0, duration: 0.3 });
        }
      });
      panels.forEach(p => {
        p.children.forEach(child => {
          if (child.material) gsap.to(child.material, { opacity: 1, duration: 0.3 });
        });
      });
      hoveredPanel.userData.isHovered = false;
      hoveredPanel = null;
    }
    renderer.domElement.style.cursor = 'default';
  }
}

renderer.domElement.addEventListener('mousemove', onMouseMove);

// Click handler
function onPanelClick(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  
  raycaster.setFromCamera(mouse, camera);
  const allObjects = [...panels.flatMap(p => p.children), innerSphere];
  const intersects = raycaster.intersectObjects(allObjects, false);
  
  const hit = findFrontFacingIntersect(intersects);
  
  if (hit && !isDetailView) {
    const clickedPanel = hit.panel;
    
    isDetailView = true;
    selectedPanel = clickedPanel;
    controls.enabled = false;
    
    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    const worldScale = new THREE.Vector3();
    
    clickedPanel.getWorldPosition(worldPos);
    clickedPanel.getWorldQuaternion(worldQuat);
    clickedPanel.getWorldScale(worldScale);
    
    coreGroup.remove(clickedPanel);
    scene.add(clickedPanel);
    
    clickedPanel.position.copy(worldPos);
    clickedPanel.quaternion.copy(worldQuat);
    clickedPanel.scale.copy(worldScale);
    
    const targetX = -2.5;
    const targetY = 0;
    const targetZ = 12;
    const targetScale = 1.4;
    
    gsap.to(clickedPanel.position, {
      x: targetX,
      y: targetY,
      z: targetZ,
      duration: 1.0,
      ease: 'power3.inOut'
    });
    
    gsap.to(clickedPanel.rotation, {
      x: 0,
      y: 0,
      z: 0,
      duration: 1.0,
      ease: 'power3.inOut'
    });
    
    gsap.to(clickedPanel.scale, {
      x: targetScale,
      y: targetScale,
      z: targetScale,
      duration: 1.0,
      ease: 'power3.inOut'
    });
    
    panels.forEach(panel => {
      if (panel !== clickedPanel && panel.parent === coreGroup) {
        panel.children.forEach(child => {
          if (child.material) {
            gsap.to(child.material, {
              opacity: 0,
              duration: 0.6,
              ease: 'power2.in'
            });
          }
        });
        
        gsap.to(panel.scale, {
          x: 0.3,
          y: 0.3,
          z: 0.3,
          duration: 0.6,
          ease: 'power2.in'
        });
        
        gsap.to(panel.position, {
          x: panel.position.x * 0.5,
          y: panel.position.y * 0.5,
          z: panel.position.z * 0.5,
          duration: 0.6,
          ease: 'power2.in'
        });
      }
    });
    
    gsap.to(coreGroup, {
      visible: false,
      duration: 0.6,
      delay: 0.5,
      onComplete: () => {
        coreGroup.visible = false;
      }
    });
    
  } else if (isDetailView && selectedPanel) {
    returnToSphereView();
  }
}

function returnToSphereView() {
  if (!selectedPanel) return;
  
  isDetailView = false;
  coreGroup.visible = true;
  
  scene.remove(selectedPanel);
  coreGroup.add(selectedPanel);
  
  // Reset position, rotation, scale
  gsap.to(selectedPanel.position, {
    x: 0, y: 0, z: 0,
    duration: 0.8,
    ease: 'power3.inOut'
  });
  
  gsap.to(selectedPanel.rotation, {
    x: 0, y: 0, z: 0,
    duration: 0.8,
    ease: 'power3.inOut'
  });
  
  gsap.to(selectedPanel.scale, {
    x: 1, y: 1, z: 1,
    duration: 0.8,
    ease: 'power3.inOut'
  });
  
  panels.forEach(panel => {
    if (panel !== selectedPanel) {
      panel.children.forEach(child => {
        if (child.material) {
          gsap.to(child.material, {
            opacity: 1,
            duration: 0.6,
            ease: 'power2.out'
          });
        }
      });
      
      gsap.to(panel.scale, {
        x: 1, y: 1, z: 1,
        duration: 0.6,
        ease: 'power2.out'
      });
      
      gsap.to(panel.position, {
        x: 0, y: 0, z: 0,
        duration: 0.6,
        ease: 'power2.out'
      });
    }
  });
  
  controls.enabled = true;
  selectedPanel = null;
}

renderer.domElement.addEventListener('click', onPanelClick);

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', onWindowResize);

setTimeout(() => {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.style.transition = 'opacity 0.5s';
    loading.style.opacity = '0';
    setTimeout(() => loading.remove(), 500);
  }
}, 500);

let time = 0;
const autoRotateSpeed = 0.002;

function animate() {
  requestAnimationFrame(animate);
  time += 0.016;
  
  controls.update();
  
  if (!isDetailView && !controls.isRotating) {
    coreGroup.rotation.y += autoRotateSpeed;
  }
  
  if (!isDetailView) {
    // Parallax camera movement
    camera.position.x = mouseX * 0.5;
    camera.position.y = -mouseY * 0.3;
    camera.lookAt(0, 0, 0);
  }
  
  renderer.render(scene, camera);
}

animate();
