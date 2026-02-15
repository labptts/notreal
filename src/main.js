import './style.css';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// ============================================================
// SCENE SETUP
// ============================================================
const scene = new THREE.Scene();

function createNoiseBackground() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(1024, 1024, 0, 1024, 1024, 1400);
  grad.addColorStop(0, '#f2f2f2');
  grad.addColorStop(0.5, '#e8e8e8');
  grad.addColorStop(1, '#d8d8d8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2048, 2048);
  const imageData = ctx.getImageData(0, 0, 2048, 2048);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 12;
    data[i] += noise;
    data[i + 1] += noise;
    data[i + 2] += noise;
  }
  ctx.putImageData(imageData, 0, 0);
  return new THREE.CanvasTexture(canvas);
}
scene.background = createNoiseBackground();

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 20);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = false;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.querySelector('#app').appendChild(renderer.domElement);

// ============================================================
// LIGHTING
// ============================================================
scene.add(new THREE.AmbientLight(0xffffff, 0.4));

const keyLight = new THREE.DirectionalLight(0xfff8f0, 1.2);
keyLight.position.set(8, 10, 8);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xe0e8ff, 0.5);
fillLight.position.set(-10, 3, 5);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffeedd, 0.7);
rimLight.position.set(-3, -5, -10);
scene.add(rimLight);

const topLight = new THREE.DirectionalLight(0xffffff, 0.3);
topLight.position.set(0, 15, 0);
scene.add(topLight);

const specLight = new THREE.PointLight(0xffffff, 0.8, 30);
specLight.position.set(5, 5, 12);
scene.add(specLight);

// ============================================================
// ENVIRONMENT MAP
// ============================================================
const pmremGenerator = new THREE.PMREMGenerator(renderer);
const envScene = new THREE.Scene();

function createStudioEnvTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const baseGrad = ctx.createLinearGradient(0, 0, 0, 512);
  baseGrad.addColorStop(0, '#fdf6f0');
  baseGrad.addColorStop(0.3, '#ffffff');
  baseGrad.addColorStop(0.5, '#f0f0f5');
  baseGrad.addColorStop(0.7, '#e8eaf0');
  baseGrad.addColorStop(1, '#d5d8e0');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, 1024, 512);
  const keyGrad = ctx.createRadialGradient(750, 120, 0, 750, 120, 250);
  keyGrad.addColorStop(0, 'rgba(255, 252, 245, 0.9)');
  keyGrad.addColorStop(0.4, 'rgba(255, 250, 240, 0.4)');
  keyGrad.addColorStop(1, 'rgba(255, 250, 240, 0)');
  ctx.fillStyle = keyGrad;
  ctx.fillRect(0, 0, 1024, 512);
  const fillG = ctx.createRadialGradient(200, 200, 0, 200, 200, 300);
  fillG.addColorStop(0, 'rgba(230, 235, 255, 0.5)');
  fillG.addColorStop(0.5, 'rgba(230, 235, 255, 0.2)');
  fillG.addColorStop(1, 'rgba(230, 235, 255, 0)');
  ctx.fillStyle = fillG;
  ctx.fillRect(0, 0, 1024, 512);
  return canvas;
}
const envCanvas = createStudioEnvTexture();
const envTexture = new THREE.CanvasTexture(envCanvas);
envTexture.mapping = THREE.EquirectangularReflectionMapping;
const envGeo = new THREE.SphereGeometry(50, 64, 32);
const envMat = new THREE.MeshBasicMaterial({ map: envTexture, side: THREE.BackSide });
envScene.add(new THREE.Mesh(envGeo, envMat));
const envMap = pmremGenerator.fromScene(envScene, 0.04).texture;
scene.environment = envMap;
pmremGenerator.dispose();

// ============================================================
// CREATORS DATA
// ============================================================
const creators = [
  { name: 'Vova Grankin', projects: ['Project 1', 'Project 2', 'Project 3', 'Project 4'] },
  { name: 'Vova Grankin', projects: ['Project 1', 'Project 2', 'Project 3', 'Project 4'] },
  { name: 'Vova Grankin', projects: ['Project 1', 'Project 2', 'Project 3', 'Project 4'] },
  { name: 'Vova Grankin', projects: ['Project 1', 'Project 2', 'Project 3', 'Project 4'] },
  { name: 'Vova Grankin', projects: ['Project 1', 'Project 2', 'Project 3', 'Project 4'] },
];

// Pyramid layout: 3 top row, 2 bottom row
const sphereRadius = 1.8;
const spacingX = 5.0;
const spacingY = 5.0;
const creatorPositions = [
  new THREE.Vector3(-spacingX, spacingY * 0.45, 0),   // top-left
  new THREE.Vector3(0, spacingY * 0.45, 0),            // top-center
  new THREE.Vector3(spacingX, spacingY * 0.45, 0),     // top-right
  new THREE.Vector3(-spacingX * 0.5, -spacingY * 0.45, 0), // bottom-left
  new THREE.Vector3(spacingX * 0.5, -spacingY * 0.45, 0),  // bottom-right
];

// ============================================================
// TEXTURE LOADING
// ============================================================
const textureLoader = new THREE.TextureLoader();
const panelImage = textureLoader.load('/Mangiant.png');
panelImage.colorSpace = THREE.SRGBColorSpace;
panelImage.minFilter = THREE.LinearMipmapLinearFilter;
panelImage.magFilter = THREE.LinearFilter;
panelImage.anisotropy = renderer.capabilities.getMaxAnisotropy();

// ============================================================
// SPHERICAL PANEL GEOMETRY
// ============================================================
function createSphericalPanelGeometry(radius, phiStart, phiLength, thetaStart, thetaLength, widthSegs = 32, heightSegs = 32) {
  const geometry = new THREE.BufferGeometry();
  const vertices = [], uvs = [], indices = [], normals = [];
  for (let y = 0; y <= heightSegs; y++) {
    const v = y / heightSegs;
    const phi = phiStart + v * phiLength;
    for (let x = 0; x <= widthSegs; x++) {
      const u = x / widthSegs;
      const theta = thetaStart + u * thetaLength;
      vertices.push(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
      );
      normals.push(
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.sin(theta)
      );
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

// ============================================================
// CREATE PROJECT LABEL TEXTURE (for each panel)
// ============================================================
function createProjectLabelTexture(projectName) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 1024, 1024);

  // Semi-transparent gradient overlay at bottom
  const grad = ctx.createLinearGradient(0, 700, 0, 1024);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 700, 1024, 324);

  // Project name
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.font = '500 48px "SF Pro Display", "Helvetica Neue", Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 2;
  ctx.fillText(projectName, 512, 900);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

// ============================================================
// BUILD CREATOR SPHERES
// ============================================================
const creatorGroups = [];    // groups positioned in the scene
const sphereMeshGroups = []; // the inner rotating sphere part per creator
const allPanels = [];        // flat list of all panel meshes for raycasting
const innerSpheres = [];     // inner sphere meshes (to ignore in raycasting)

const gap = 0.04;
// 4 panels: 2 rows x 2 columns on sphere
const panelLayout = [];
const phiBoundaries = [0.35, Math.PI / 2, Math.PI - 0.35];
const panelsPerRow = 2;
for (let row = 0; row < 2; row++) {
  const phiStart = phiBoundaries[row] + gap;
  const phiEnd = phiBoundaries[row + 1] - gap;
  const phiLength = phiEnd - phiStart;
  const thetaSize = Math.PI * 2 / panelsPerRow;
  for (let col = 0; col < panelsPerRow; col++) {
    const thetaStart = col * thetaSize + gap;
    const thetaLength = thetaSize - gap * 2;
    panelLayout.push({ phiStart, phiLength, thetaStart, thetaLength });
  }
}

creators.forEach((creator, ci) => {
  // Outer group: handles position in scene
  const creatorGroup = new THREE.Group();
  creatorGroup.position.copy(creatorPositions[ci]);
  scene.add(creatorGroup);

  // Inner sphere group: this is what rotates when dragged
  const sphereGroup = new THREE.Group();
  creatorGroup.add(sphereGroup);

  // Gap-filling inner sphere
  const innerGeo = new THREE.SphereGeometry(sphereRadius - 0.03, 48, 48);
  const innerMat = new THREE.MeshBasicMaterial({ color: 0xe8e8e8, side: THREE.FrontSide });
  const innerSphere = new THREE.Mesh(innerGeo, innerMat);
  sphereGroup.add(innerSphere);
  innerSpheres.push(innerSphere);

  // 4 project panels
  creator.projects.forEach((projName, pi) => {
    const config = panelLayout[pi];
    const cardGroup = new THREE.Group();

    // Front
    const frontGeo = createSphericalPanelGeometry(sphereRadius, config.phiStart, config.phiLength, config.thetaStart, config.thetaLength);
    const frontMat = new THREE.MeshPhysicalMaterial({
      map: panelImage,
      side: THREE.FrontSide,
      roughness: 0.3,
      metalness: 0.05,
      clearcoat: 0.6,
      clearcoatRoughness: 0.2,
      envMapIntensity: 0.6,
      transparent: true,
      opacity: 1
    });
    const frontPanel = new THREE.Mesh(frontGeo, frontMat);
    cardGroup.add(frontPanel);

    // Project label overlay
    const labelGeo = createSphericalPanelGeometry(sphereRadius + 0.01, config.phiStart, config.phiLength, config.thetaStart, config.thetaLength);
    const labelMat = new THREE.MeshBasicMaterial({
      map: createProjectLabelTexture(projName),
      side: THREE.FrontSide,
      transparent: true,
      depthWrite: false
    });
    const labelPanel = new THREE.Mesh(labelGeo, labelMat);
    cardGroup.add(labelPanel);

    // Back
    const backGeo = createSphericalPanelGeometry(sphereRadius - 0.03, config.phiStart, config.phiLength, config.thetaStart, config.thetaLength);
    const backMat = new THREE.MeshPhysicalMaterial({
      color: 0x111111,
      side: THREE.BackSide,
      roughness: 0.5,
      metalness: 0.1
    });
    const backPanel = new THREE.Mesh(backGeo, backMat);
    cardGroup.add(backPanel);

    cardGroup.userData = {
      creatorIndex: ci,
      projectIndex: pi,
      projectName: projName,
      creatorName: creator.name,
      isHovered: false
    };

    sphereGroup.add(cardGroup);
    allPanels.push(cardGroup);
  });

  // Slight random initial rotation per sphere
  sphereGroup.rotation.y = Math.random() * Math.PI * 2;
  sphereGroup.rotation.x = (Math.random() - 0.5) * 0.3;

  creatorGroup.userData = { creatorIndex: ci, name: creator.name };
  creatorGroups.push(creatorGroup);
  sphereMeshGroups.push(sphereGroup);
});

// ============================================================
// HTML NAME LABELS (CSS2D-style, manually projected)
// ============================================================
const nameLabelsContainer = document.createElement('div');
nameLabelsContainer.id = 'name-labels';
nameLabelsContainer.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;';
document.body.appendChild(nameLabelsContainer);

const nameLabels = creators.map((creator, i) => {
  const el = document.createElement('div');
  el.className = 'creator-name-label';
  el.textContent = creator.name;
  el.style.cssText = `
    position: absolute;
    color: #333;
    font-size: 14px;
    font-weight: 500;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    font-family: 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
    white-space: nowrap;
    transform: translate(-50%, 0);
    text-align: center;
    opacity: 0.85;
    transition: opacity 0.3s;
  `;
  nameLabelsContainer.appendChild(el);
  return el;
});

function updateNameLabels() {
  creatorGroups.forEach((group, i) => {
    // Project label position below the sphere
    const worldPos = new THREE.Vector3(0, -(sphereRadius + 0.5), 0);
    group.localToWorld(worldPos);
    worldPos.project(camera);
    const x = (worldPos.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-worldPos.y * 0.5 + 0.5) * window.innerHeight;
    nameLabels[i].style.left = x + 'px';
    nameLabels[i].style.top = y + 'px';

    // Hide if behind camera
    nameLabels[i].style.display = worldPos.z > 1 ? 'none' : 'block';
  });
}

// ============================================================
// APP STATE
// ============================================================
let isDetailView = false;
let selectedPanel = null;
let selectedCreatorIndex = -1;
let mouseX = 0;
let mouseY = 0;
const baseCameraPos = new THREE.Vector3(0, 0, 20);

document.addEventListener('mousemove', (e) => {
  mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
  mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
});

// ============================================================
// PER-SPHERE DRAG ROTATION
// ============================================================
class SphereRotationController {
  constructor(domElement) {
    this.domElement = domElement;
    this.activeSphere = null;
    this.activeSphereIndex = -1;
    this.isRotating = false;
    this.previousMouse = { x: 0, y: 0 };
    this.startMouse = { x: 0, y: 0 };
    this.velocities = [];  // per-sphere velocities
    this.dampingFactor = 0.92;
    this.hasDragged = false;

    for (let i = 0; i < creators.length; i++) {
      this.velocities.push({ x: 0, y: 0 });
    }

    this.setupEvents();
  }

  setupEvents() {
    this.domElement.addEventListener('mousedown', (e) => this.onDown(e));
    this.domElement.addEventListener('mousemove', (e) => this.onMove(e));
    this.domElement.addEventListener('mouseup', () => this.onUp());
    this.domElement.addEventListener('mouseleave', () => this.onUp());

    this.domElement.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.onDown(e.touches[0]);
    }, { passive: false });
    this.domElement.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this.onMove(e.touches[0]);
    }, { passive: false });
    this.domElement.addEventListener('touchend', () => this.onUp());
  }

  hitTestSphere(event) {
    const rect = this.domElement.getBoundingClientRect();
    const mx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const my = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(new THREE.Vector2(mx, my), camera);

    for (let i = 0; i < sphereMeshGroups.length; i++) {
      const objects = sphereMeshGroups[i].children;
      const hits = raycaster.intersectObjects(objects, true);
      if (hits.length > 0) return i;
    }
    return -1;
  }

  onDown(event) {
    if (isDetailView) return;
    this.startMouse = { x: event.clientX, y: event.clientY };
    this.previousMouse = { x: event.clientX, y: event.clientY };
    this.hasDragged = false;

    const idx = this.hitTestSphere(event);
    if (idx >= 0) {
      this.activeSphereIndex = idx;
      this.activeSphere = sphereMeshGroups[idx];
      this.isRotating = true;
      this.velocities[idx] = { x: 0, y: 0 };
    }
  }

  onMove(event) {
    if (!this.isRotating || !this.activeSphere || isDetailView) return;

    const dx = event.clientX - this.previousMouse.x;
    const dy = event.clientY - this.previousMouse.y;

    const totalDx = event.clientX - this.startMouse.x;
    const totalDy = event.clientY - this.startMouse.y;
    if (Math.sqrt(totalDx * totalDx + totalDy * totalDy) > 3) {
      this.hasDragged = true;
    }

    const speed = 0.006;
    this.activeSphere.rotation.y += dx * speed;
    this.activeSphere.rotation.x += dy * speed;

    const idx = this.activeSphereIndex;
    this.velocities[idx].x = dy * speed;
    this.velocities[idx].y = dx * speed;

    this.previousMouse = { x: event.clientX, y: event.clientY };
  }

  onUp() {
    this.isRotating = false;
    this.activeSphere = null;
  }

  update() {
    for (let i = 0; i < sphereMeshGroups.length; i++) {
      const sg = sphereMeshGroups[i];
      const v = this.velocities[i];

      if (this.activeSphereIndex !== i || !this.isRotating) {
        sg.rotation.x += v.x;
        sg.rotation.y += v.y;
        v.x *= this.dampingFactor;
        v.y *= this.dampingFactor;
        if (Math.abs(v.x) < 0.0001) v.x = 0;
        if (Math.abs(v.y) < 0.0001) v.y = 0;
      }

      // Slow auto-rotation when idle
      if (!this.isRotating || this.activeSphereIndex !== i) {
        sg.rotation.y += 0.001;
      }
    }
  }
}

const sphereController = new SphereRotationController(renderer.domElement);

// ============================================================
// RAYCASTING
// ============================================================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredPanel = null;

function isFrontFacing(intersect) {
  if (!intersect.face) return false;
  const normal = intersect.face.normal.clone();
  normal.transformDirection(intersect.object.matrixWorld);
  const toCamera = new THREE.Vector3().subVectors(camera.position, intersect.point).normalize();
  return normal.dot(toCamera) > 0.1;
}

function findFrontFacingPanel(intersects) {
  for (const intersect of intersects) {
    if (innerSpheres.includes(intersect.object)) continue;
    if (intersect.object.material && intersect.object.material.side === THREE.BackSide) continue;
    if (isFrontFacing(intersect)) {
      let panel = intersect.object;
      while (panel.parent && !allPanels.includes(panel)) {
        panel = panel.parent;
      }
      if (allPanels.includes(panel)) {
        return { intersect, panel };
      }
    }
  }
  return null;
}

// ============================================================
// HOVER
// ============================================================
function onMouseMove(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  if (isDetailView) return;

  raycaster.setFromCamera(mouse, camera);
  const allObjects = sphereMeshGroups.flatMap(sg => sg.children.flatMap(c => c.children || [c]));
  const intersects = raycaster.intersectObjects(allObjects, true);
  const hit = findFrontFacingPanel(intersects);

  if (hit) {
    const panel = hit.panel;
    if (hoveredPanel !== panel) {
      if (hoveredPanel) unhoverPanel(hoveredPanel);
      hoveredPanel = panel;
      hoveredPanel.userData.isHovered = true;
      gsap.to(panel.scale, { x: 1.06, y: 1.06, z: 1.06, duration: 0.3, ease: 'power2.out' });
      panel.children.forEach(child => {
        if (child.material && child.material.emissive) {
          child.material.emissive.set(0xffffff);
          gsap.to(child.material, { emissiveIntensity: 0.1, duration: 0.3 });
        }
      });
    }
    renderer.domElement.style.cursor = 'pointer';
  } else {
    if (hoveredPanel) {
      unhoverPanel(hoveredPanel);
      hoveredPanel = null;
    }
    renderer.domElement.style.cursor = sphereController.isRotating ? 'grabbing' : 'default';
  }
}

function unhoverPanel(panel) {
  gsap.to(panel.scale, { x: 1, y: 1, z: 1, duration: 0.3, ease: 'power2.out' });
  panel.children.forEach(child => {
    if (child.material && child.material.emissive) {
      gsap.to(child.material, { emissiveIntensity: 0, duration: 0.3 });
    }
  });
  panel.userData.isHovered = false;
}

renderer.domElement.addEventListener('mousemove', onMouseMove);

// ============================================================
// DETAIL VIEW
// ============================================================
// Info panel overlay (HTML)
const infoPanel = document.createElement('div');
infoPanel.id = 'info-panel';
infoPanel.style.cssText = `
  position: fixed;
  right: 60px;
  top: 50%;
  transform: translateY(-50%);
  width: 320px;
  padding: 40px;
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  z-index: 100;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.5s ease;
  font-family: 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
  box-shadow: 0 8px 32px rgba(0,0,0,0.1);
`;
infoPanel.innerHTML = `
  <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #999; margin-bottom: 8px;" id="info-creator"></div>
  <div style="font-size: 28px; font-weight: 600; color: #1a1a1a; margin-bottom: 16px;" id="info-project"></div>
  <div style="font-size: 14px; color: #666; line-height: 1.6; margin-bottom: 24px;">This is a showcase project demonstrating creative work and artistic vision.</div>
  <button id="info-close" style="
    background: #1a1a1a; color: white; border: none; padding: 12px 28px; border-radius: 8px;
    font-size: 14px; cursor: pointer; font-family: inherit; letter-spacing: 1px; transition: background 0.2s;
  ">Close</button>
`;
document.body.appendChild(infoPanel);

document.getElementById('info-close').addEventListener('click', returnToOverview);
document.getElementById('info-close').addEventListener('mouseenter', (e) => { e.target.style.background = '#333'; });
document.getElementById('info-close').addEventListener('mouseleave', (e) => { e.target.style.background = '#1a1a1a'; });

function openDetailView(panel) {
  if (isDetailView) return;
  isDetailView = true;
  selectedPanel = panel;
  selectedCreatorIndex = panel.userData.creatorIndex;

  // Update info panel text
  document.getElementById('info-creator').textContent = panel.userData.creatorName;
  document.getElementById('info-project').textContent = panel.userData.projectName;

  const creatorGroup = creatorGroups[selectedCreatorIndex];
  const targetPos = creatorGroup.position.clone();

  // Zoom camera towards this creator's sphere
  gsap.to(camera.position, {
    x: targetPos.x,
    y: targetPos.y,
    z: 10,
    duration: 1.0,
    ease: 'power3.inOut'
  });

  // Fade other creators
  creatorGroups.forEach((g, i) => {
    if (i !== selectedCreatorIndex) {
      gsap.to(g.position, { z: -3, duration: 0.8, ease: 'power2.in' });
      sphereMeshGroups[i].children.forEach(child => {
        if (child.children) {
          child.children.forEach(m => {
            if (m.material && m.material.transparent !== undefined) {
              m.material.transparent = true;
              gsap.to(m.material, { opacity: 0, duration: 0.6 });
            }
          });
        }
        if (child.material) {
          child.material.transparent = true;
          gsap.to(child.material, { opacity: 0, duration: 0.6 });
        }
      });
      nameLabels[i].style.opacity = '0';
    }
  });

  // Show info panel
  setTimeout(() => {
    infoPanel.style.opacity = '1';
    infoPanel.style.pointerEvents = 'auto';
  }, 500);

  // Hide instructions
  const instr = document.getElementById('instructions');
  if (instr) instr.style.opacity = '0';
}

function returnToOverview() {
  if (!isDetailView) return;
  isDetailView = false;

  // Hide info panel
  infoPanel.style.opacity = '0';
  infoPanel.style.pointerEvents = 'none';

  // Reset camera
  gsap.to(camera.position, {
    x: baseCameraPos.x,
    y: baseCameraPos.y,
    z: baseCameraPos.z,
    duration: 1.0,
    ease: 'power3.inOut'
  });

  // Restore all creators
  creatorGroups.forEach((g, i) => {
    gsap.to(g.position, { z: 0, duration: 0.8, ease: 'power2.out' });
    sphereMeshGroups[i].children.forEach(child => {
      if (child.children) {
        child.children.forEach(m => {
          if (m.material) gsap.to(m.material, { opacity: 1, duration: 0.6 });
        });
      }
      if (child.material) gsap.to(child.material, { opacity: 1, duration: 0.6 });
    });
    nameLabels[i].style.opacity = '0.85';
  });

  // Show instructions
  const instr = document.getElementById('instructions');
  if (instr) instr.style.opacity = '0.8';

  selectedPanel = null;
  selectedCreatorIndex = -1;
}

// Click handler
renderer.domElement.addEventListener('click', (event) => {
  if (sphereController.hasDragged) return;

  if (isDetailView) {
    returnToOverview();
    return;
  }

  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const allObjects = sphereMeshGroups.flatMap(sg => sg.children.flatMap(c => c.children || [c]));
  const intersects = raycaster.intersectObjects(allObjects, true);
  const hit = findFrontFacingPanel(intersects);

  if (hit) {
    openDetailView(hit.panel);
  }
});

// ESC to close detail
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && isDetailView) returnToOverview();
});

// ============================================================
// RESIZE
// ============================================================
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onWindowResize);

// ============================================================
// LOADING
// ============================================================
setTimeout(() => {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.style.transition = 'opacity 0.5s';
    loading.style.opacity = '0';
    setTimeout(() => loading.remove(), 500);
  }
}, 500);

// ============================================================
// POST-PROCESSING
// ============================================================
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const filmGrainCA = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    grainIntensity: { value: 0.02 },
    caOffset: { value: 0.0003 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float grainIntensity;
    uniform float caOffset;
    varying vec2 vUv;
    float random(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }
    void main() {
      vec2 dir = vUv - vec2(0.5);
      float dist = length(dir);
      vec2 offset = dir * caOffset * dist;
      float r = texture2D(tDiffuse, vUv + offset).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - offset).b;
      float a = texture2D(tDiffuse, vUv).a;
      vec4 color = vec4(r, g, b, a);
      float grain = random(vUv + fract(time)) * grainIntensity;
      color.rgb += grain - grainIntensity * 0.5;
      gl_FragColor = color;
    }
  `
};
const filmGrainPass = new ShaderPass(filmGrainCA);
composer.addPass(filmGrainPass);

// ============================================================
// ANIMATION LOOP
// ============================================================
let time = 0;

function animate() {
  requestAnimationFrame(animate);
  time += 0.016;

  sphereController.update();

  // Parallax camera
  if (!isDetailView) {
    camera.position.x = baseCameraPos.x + mouseX * 0.6;
    camera.position.y = baseCameraPos.y - mouseY * 0.4;
    camera.lookAt(0, 0, 0);
  } else {
    // In detail view, subtle parallax around the selected creator
    const target = creatorGroups[selectedCreatorIndex]?.position || new THREE.Vector3();
    camera.lookAt(target.x, target.y, 0);
  }

  // Update name label positions
  updateNameLabels();

  filmGrainPass.uniforms.time.value = time;
  composer.render();
}

animate();
