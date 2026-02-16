import './style.css';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// ============================================================
// CUSTOM CURSOR (inversion circle)
// ============================================================
const cursorEl = document.createElement('div');
cursorEl.id = 'custom-cursor';
cursorEl.style.cssText = `
  position: fixed; top: 0; left: 0; width: 32px; height: 32px;
  border-radius: 50%; pointer-events: none; z-index: 9999;
  mix-blend-mode: difference;
  background: radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0.6) 40%, rgba(255,255,255,0) 70%);
  transform: translate(-50%, -50%);
  transition: width 0.25s ease, height 0.25s ease;
`;
document.body.appendChild(cursorEl);
document.body.style.cursor = 'none';

let cursorX = 0, cursorY = 0, cursorTargetX = 0, cursorTargetY = 0;
document.addEventListener('mousemove', (e) => {
  cursorTargetX = e.clientX;
  cursorTargetY = e.clientY;
});
function updateCursor() {
  cursorX += (cursorTargetX - cursorX) * 0.15;
  cursorY += (cursorTargetY - cursorY) * 0.15;
  cursorEl.style.left = cursorX + 'px';
  cursorEl.style.top = cursorY + 'px';
}
function setCursorHover(isHover) {
  const s = isHover ? '48px' : '32px';
  cursorEl.style.width = s;
  cursorEl.style.height = s;
}

// ============================================================
// SCENE SETUP — white background
// ============================================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

// Fog for depth haze
scene.fog = new THREE.FogExp2(0xffffff, 0.012);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
const baseCameraZ = 22;
camera.position.set(0, 0, baseCameraZ);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = false;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.85;
document.querySelector('#app').appendChild(renderer.domElement);

// ============================================================
// LIGHTING
// ============================================================
scene.add(new THREE.AmbientLight(0xffffff, 0.35));

const keyLight = new THREE.DirectionalLight(0xfff8f0, 0.6);
keyLight.position.set(8, 10, 8);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xe0e8ff, 0.35);
fillLight.position.set(-10, 3, 5);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffeedd, 0.3);
rimLight.position.set(-3, -5, -10);
scene.add(rimLight);

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
  keyGrad.addColorStop(0, 'rgba(255, 252, 245, 0.4)');
  keyGrad.addColorStop(0.4, 'rgba(255, 250, 240, 0.15)');
  keyGrad.addColorStop(1, 'rgba(255, 250, 240, 0)');
  ctx.fillStyle = keyGrad;
  ctx.fillRect(0, 0, 1024, 512);
  const fillG = ctx.createRadialGradient(200, 200, 0, 200, 200, 300);
  fillG.addColorStop(0, 'rgba(230, 235, 255, 0.25)');
  fillG.addColorStop(0.5, 'rgba(230, 235, 255, 0.1)');
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

// Pyramid layout: 3 top row, 2 bottom row — BIGGER spheres
const sphereRadius = 2.6;
const spacingX = 6.8;
const spacingY = 6.8;
const creatorPositions = [
  new THREE.Vector3(-spacingX, spacingY * 0.45, 0),
  new THREE.Vector3(0, spacingY * 0.45, 0),
  new THREE.Vector3(spacingX, spacingY * 0.45, 0),
  new THREE.Vector3(-spacingX * 0.5, -spacingY * 0.45, 0),
  new THREE.Vector3(spacingX * 0.5, -spacingY * 0.45, 0),
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
// IRIDESCENT + FRESNEL OVERLAY MATERIAL
// ============================================================
const iridescentShader = {
  uniforms: {
    time: { value: 0 },
    iriIntensity: { value: 0.05 },
    fresnelPower: { value: 3.0 },
    fresnelIntensity: { value: 0.1 },
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
      vNormal = normalize(normalMatrix * normal);
      vViewDir = normalize(-mvPos.xyz);
      gl_Position = projectionMatrix * mvPos;
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform float iriIntensity;
    uniform float fresnelPower;
    uniform float fresnelIntensity;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying vec2 vUv;

    vec3 iridescence(float angle) {
      // Thin-film interference approximation
      float t = angle * 6.2832 + time * 0.3;
      return vec3(
        0.5 + 0.5 * cos(t),
        0.5 + 0.5 * cos(t + 2.094),
        0.5 + 0.5 * cos(t + 4.189)
      );
    }

    void main() {
      float fresnel = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), fresnelPower);

      // Iridescent color based on view angle
      float angle = dot(vNormal, vViewDir);
      vec3 iriColor = iridescence(angle) * iriIntensity * fresnel;

      // Fresnel rim glow (white)
      vec3 rimGlow = vec3(1.0) * fresnel * fresnelIntensity;

      gl_FragColor = vec4(iriColor + rimGlow, fresnel * 0.6);
    }
  `
};

// ============================================================
// CREATE PROJECT LABEL TEXTURE (for each panel)
// ============================================================
function createProjectLabelTexture(projectName, labelAtTop = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 1024, 1024);

  if (labelAtTop) {
    const grad = ctx.createLinearGradient(0, 0, 0, 324);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 324);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.font = '500 48px "SF Pro Display", "Helvetica Neue", Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 2;
    ctx.fillText(projectName, 512, 124);
  } else {
    const grad = ctx.createLinearGradient(0, 700, 0, 1024);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 700, 1024, 324);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.font = '500 48px "SF Pro Display", "Helvetica Neue", Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 2;
    ctx.fillText(projectName, 512, 900);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

// ============================================================
// BUILD CREATOR SPHERES
// ============================================================
const creatorGroups = [];
const sphereMeshGroups = [];
const allPanels = [];
const innerSpheres = [];
const iridescentMeshes = []; // for time uniform update

// NO GAP — panels fully adjacent
const gap = 0.0;
// 4 panels: 2 rows x 2 columns covering visible sphere
const panelLayout = [];
const phiBoundaries = [0.01, Math.PI / 2, Math.PI - 0.01];
const panelsPerRow = 2;
for (let row = 0; row < 2; row++) {
  const phiStart = phiBoundaries[row] + gap;
  const phiEnd = phiBoundaries[row + 1] - gap;
  const phiLength = phiEnd - phiStart;
  const thetaSize = Math.PI * 2 / panelsPerRow;
  for (let col = 0; col < panelsPerRow; col++) {
    const thetaStart = col * thetaSize + gap;
    const thetaLength = thetaSize - gap * 2;
    panelLayout.push({ phiStart, phiLength, thetaStart, thetaLength, row });
  }
}

creators.forEach((creator, ci) => {
  const creatorGroup = new THREE.Group();
  creatorGroup.position.copy(creatorPositions[ci]);
  // Store original Y for floating animation
  creatorGroup.userData = { creatorIndex: ci, name: creator.name, baseY: creatorPositions[ci].y };
  scene.add(creatorGroup);

  const sphereGroup = new THREE.Group();
  creatorGroup.add(sphereGroup);

  // Inner sphere — no more gaps visible
  const innerGeo = new THREE.SphereGeometry(sphereRadius - 0.02, 64, 64);
  const innerMat = new THREE.MeshPhysicalMaterial({
    color: 0x222222,
    side: THREE.FrontSide,
    roughness: 0.8,
    metalness: 0.1
  });
  const innerSphere = new THREE.Mesh(innerGeo, innerMat);
  sphereGroup.add(innerSphere);
  innerSpheres.push(innerSphere);

  // 4 project panels
  creator.projects.forEach((projName, pi) => {
    const config = panelLayout[pi];
    const cardGroup = new THREE.Group();

    // Front panel
    const frontGeo = createSphericalPanelGeometry(sphereRadius, config.phiStart, config.phiLength, config.thetaStart, config.thetaLength);
    const frontMat = new THREE.MeshPhysicalMaterial({
      map: panelImage,
      side: THREE.FrontSide,
      roughness: 0.12,
      metalness: 0.02,
      clearcoat: 0.7,
      clearcoatRoughness: 0.05,
      envMapIntensity: 0.4,
      transparent: true,
      opacity: 1
    });
    const frontPanel = new THREE.Mesh(frontGeo, frontMat);
    cardGroup.add(frontPanel);

    // Project label overlay
    const labelAtTop = config.row === 1;
    const labelGeo = createSphericalPanelGeometry(sphereRadius + 0.005, config.phiStart, config.phiLength, config.thetaStart, config.thetaLength);
    const labelMat = new THREE.MeshBasicMaterial({
      map: createProjectLabelTexture(projName, labelAtTop),
      side: THREE.FrontSide,
      transparent: true,
      depthWrite: false
    });
    const labelPanel = new THREE.Mesh(labelGeo, labelMat);
    cardGroup.add(labelPanel);

    // Back
    const backGeo = createSphericalPanelGeometry(sphereRadius - 0.02, config.phiStart, config.phiLength, config.thetaStart, config.thetaLength);
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

  // Iridescent + Fresnel overlay sphere (full sphere on top)
  const iriGeo = new THREE.SphereGeometry(sphereRadius + 0.02, 64, 64);
  const iriMat = new THREE.ShaderMaterial({
    ...iridescentShader,
    uniforms: {
      time: { value: 0 },
      iriIntensity: { value: 0.05 },
      fresnelPower: { value: 3.0 },
      fresnelIntensity: { value: 0.1 },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
  });
  const iriMesh = new THREE.Mesh(iriGeo, iriMat);
  sphereGroup.add(iriMesh);
  iridescentMeshes.push(iriMat);

  sphereGroup.rotation.y = Math.random() * Math.PI * 2;
  sphereGroup.rotation.x = (Math.random() - 0.5) * 0.3;

  creatorGroups.push(creatorGroup);
  sphereMeshGroups.push(sphereGroup);
});

// ============================================================
// HTML NAME LABELS — with blur-reveal animation
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
    color: #222;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 2px;
    text-transform: uppercase;
    font-family: 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
    white-space: nowrap;
    transform: translate(-50%, 0);
    text-align: center;
    opacity: 0;
    filter: blur(12px);
    transition: opacity 0.3s, filter 0.3s;
  `;
  nameLabelsContainer.appendChild(el);
  return el;
});

// Blur-reveal on load
setTimeout(() => {
  nameLabels.forEach((el, i) => {
    setTimeout(() => {
      el.style.opacity = '0.85';
      el.style.filter = 'blur(0px)';
    }, 300 + i * 120);
  });
}, 600);

function updateNameLabels() {
  creatorGroups.forEach((group, i) => {
    const worldPos = new THREE.Vector3(0, -(sphereRadius + 0.7), 0);
    group.localToWorld(worldPos);
    worldPos.project(camera);
    const x = (worldPos.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-worldPos.y * 0.5 + 0.5) * window.innerHeight;
    nameLabels[i].style.left = x + 'px';
    nameLabels[i].style.top = y + 'px';
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
const baseCameraPos = new THREE.Vector3(0, 0, baseCameraZ);
// Camera offset from drag-pan
const cameraPanOffset = new THREE.Vector2(0, 0);

document.addEventListener('mousemove', (e) => {
  mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
  mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
});

// ============================================================
// SCROLL ZOOM
// ============================================================
const ZOOM_MIN = 12;
const ZOOM_MAX = 30;
renderer.domElement.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (isDetailView) return;
  const delta = e.deltaY * 0.01;
  baseCameraPos.z = THREE.MathUtils.clamp(baseCameraPos.z + delta, ZOOM_MIN, ZOOM_MAX);
}, { passive: false });

// ============================================================
// CAMERA PAN (drag on empty space) + PER-SPHERE ROTATION (drag on sphere)
// ============================================================
class InteractionController {
  constructor(domElement) {
    this.domElement = domElement;
    // Sphere rotation
    this.activeSphere = null;
    this.activeSphereIndex = -1;
    this.isRotatingSphere = false;
    this.velocities = creators.map(() => ({ x: 0, y: 0 }));
    this.dampingFactor = 0.92;
    // Camera pan
    this.isPanning = false;
    this.panVelocity = new THREE.Vector2(0, 0);
    // Common
    this.previousMouse = { x: 0, y: 0 };
    this.startMouse = { x: 0, y: 0 };
    this.hasDragged = false;
    this.wasPanning = false; // if most recent drag was a pan (not sphere)

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
      const hits = raycaster.intersectObjects(sphereMeshGroups[i].children, true);
      if (hits.length > 0) return i;
    }
    return -1;
  }

  onDown(event) {
    this.startMouse = { x: event.clientX, y: event.clientY };
    this.previousMouse = { x: event.clientX, y: event.clientY };
    this.hasDragged = false;
    this.wasPanning = false;

    if (isDetailView) {
      // In detail view, only allow rotating the selected sphere
      const idx = this.hitTestSphere(event);
      if (idx === selectedCreatorIndex) {
        this.activeSphereIndex = idx;
        this.activeSphere = sphereMeshGroups[idx];
        this.isRotatingSphere = true;
        this.velocities[idx] = { x: 0, y: 0 };
      }
      return;
    }

    const idx = this.hitTestSphere(event);
    if (idx >= 0) {
      // Start sphere rotation
      this.activeSphereIndex = idx;
      this.activeSphere = sphereMeshGroups[idx];
      this.isRotatingSphere = true;
      this.velocities[idx] = { x: 0, y: 0 };
    } else {
      // Start camera pan
      this.isPanning = true;
      this.panVelocity.set(0, 0);
    }
  }

  onMove(event) {
    const dx = event.clientX - this.previousMouse.x;
    const dy = event.clientY - this.previousMouse.y;
    const totalDx = event.clientX - this.startMouse.x;
    const totalDy = event.clientY - this.startMouse.y;
    if (Math.sqrt(totalDx * totalDx + totalDy * totalDy) > 3) {
      this.hasDragged = true;
    }

    if (this.isRotatingSphere && this.activeSphere) {
      const speed = 0.006;
      this.activeSphere.rotation.y += dx * speed;
      this.activeSphere.rotation.x += dy * speed;
      const idx = this.activeSphereIndex;
      this.velocities[idx].x = dy * speed;
      this.velocities[idx].y = dx * speed;
    } else if (this.isPanning) {
      this.wasPanning = true;
      const panSpeed = 0.012;
      cameraPanOffset.x -= dx * panSpeed;
      cameraPanOffset.y += dy * panSpeed;
      this.panVelocity.set(-dx * panSpeed, dy * panSpeed);
    }

    this.previousMouse = { x: event.clientX, y: event.clientY };
  }

  onUp() {
    this.isRotatingSphere = false;
    this.activeSphere = null;
    this.isPanning = false;
  }

  update() {
    // Sphere inertia + auto-rotate
    for (let i = 0; i < sphereMeshGroups.length; i++) {
      const sg = sphereMeshGroups[i];
      const v = this.velocities[i];
      if (this.activeSphereIndex !== i || !this.isRotatingSphere) {
        sg.rotation.x += v.x;
        sg.rotation.y += v.y;
        v.x *= this.dampingFactor;
        v.y *= this.dampingFactor;
        if (Math.abs(v.x) < 0.0001) v.x = 0;
        if (Math.abs(v.y) < 0.0001) v.y = 0;
      }
      if (!this.isRotatingSphere || this.activeSphereIndex !== i) {
        sg.rotation.y += 0.001;
      }
    }
    // Pan inertia
    if (!this.isPanning) {
      cameraPanOffset.x += this.panVelocity.x;
      cameraPanOffset.y += this.panVelocity.y;
      this.panVelocity.multiplyScalar(0.9);
      if (this.panVelocity.length() < 0.0001) this.panVelocity.set(0, 0);
    }
    // Clamp pan
    cameraPanOffset.x = THREE.MathUtils.clamp(cameraPanOffset.x, -5, 5);
    cameraPanOffset.y = THREE.MathUtils.clamp(cameraPanOffset.y, -4, 4);
  }
}

const controller = new InteractionController(renderer.domElement);

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
    // Skip iridescent overlay
    if (intersect.object.material && intersect.object.material.isShaderMaterial) continue;
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
// HOVER + MAGNETIC TILT
// ============================================================
const hoverTilts = creators.map(() => ({ x: 0, y: 0 }));

function onMouseMoveHover(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  if (controller.isPanning || controller.wasPanning) {
    setCursorHover(false);
    return;
  }

  if (isDetailView) {
    // In detail view, hover only on selected sphere panels
    raycaster.setFromCamera(mouse, camera);
    const selectedObjects = sphereMeshGroups[selectedCreatorIndex].children.flatMap(c => c.children || [c]);
    const intersects = raycaster.intersectObjects(selectedObjects, true);
    const hit = findFrontFacingPanel(intersects);
    if (hit && !controller.isRotatingSphere) {
      setCursorHover(true);
    } else {
      setCursorHover(false);
    }
    return;
  }

  raycaster.setFromCamera(mouse, camera);
  const allObjects = sphereMeshGroups.flatMap(sg => sg.children.flatMap(c => c.children || [c]));
  const intersects = raycaster.intersectObjects(allObjects, true);
  const hit = findFrontFacingPanel(intersects);

  if (hit && !controller.isRotatingSphere) {
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

    // Magnetic tilt: tilt the entire creator sphere towards cursor
    const ci = panel.userData.creatorIndex;
    const group = creatorGroups[ci];
    const worldPos = new THREE.Vector3();
    group.getWorldPosition(worldPos);
    worldPos.project(camera);
    const sx = (worldPos.x * 0.5 + 0.5) * window.innerWidth;
    const sy = (-worldPos.y * 0.5 + 0.5) * window.innerHeight;
    const offX = (event.clientX - sx) / window.innerWidth;
    const offY = (event.clientY - sy) / window.innerHeight;
    hoverTilts[ci].x = offY * 0.15;
    hoverTilts[ci].y = offX * 0.15;

    setCursorHover(true);
  } else {
    if (hoveredPanel) {
      const ci = hoveredPanel.userData.creatorIndex;
      hoverTilts[ci].x = 0;
      hoverTilts[ci].y = 0;
      unhoverPanel(hoveredPanel);
      hoveredPanel = null;
    }
    setCursorHover(false);
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

renderer.domElement.addEventListener('mousemove', onMouseMoveHover);

// ============================================================
// DETAIL VIEW
// ============================================================
// LEFT: Creator info panel
const creatorInfoPanel = document.createElement('div');
creatorInfoPanel.id = 'creator-info-panel';
creatorInfoPanel.style.cssText = `
  position: fixed; left: 60px; top: 50%; transform: translateY(-50%);
  width: 280px; padding: 0;
  z-index: 100; opacity: 0; pointer-events: none;
  transition: opacity 0.5s ease;
  font-family: 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
`;
creatorInfoPanel.innerHTML = `
  <div style="font-size: 28px; font-weight: 600; color: #1a1a1a; margin-bottom: 12px;" id="detail-creator-name"></div>
  <div style="font-size: 14px; color: #666; line-height: 1.6;">создает ии-ролики и ии-фотографии красиво</div>
`;
document.body.appendChild(creatorInfoPanel);

// RIGHT: Project info panel
const projectInfoPanel = document.createElement('div');
projectInfoPanel.id = 'project-info-panel';
projectInfoPanel.style.cssText = `
  position: fixed; right: 60px; top: 50%; transform: translateY(-50%);
  width: 280px; padding: 40px;
  background: rgba(255,255,255,0.95); backdrop-filter: blur(20px);
  border-radius: 16px; z-index: 100; opacity: 0; pointer-events: none;
  transition: opacity 0.5s ease;
  font-family: 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
  box-shadow: 0 8px 32px rgba(0,0,0,0.1);
`;
projectInfoPanel.innerHTML = `
  <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #999; margin-bottom: 8px;">Проект</div>
  <div style="font-size: 28px; font-weight: 600; color: #1a1a1a; margin-bottom: 24px;" id="detail-project-name"></div>
  <button id="detail-close" style="
    background: #1a1a1a; color: white; border: none; padding: 12px 28px; border-radius: 8px;
    font-size: 14px; cursor: none; font-family: inherit; letter-spacing: 1px; transition: background 0.2s;
  ">Close</button>
`;
document.body.appendChild(projectInfoPanel);

document.getElementById('detail-close').addEventListener('click', returnToOverview);
document.getElementById('detail-close').addEventListener('mouseenter', (e) => { e.target.style.background = '#333'; setCursorHover(true); });
document.getElementById('detail-close').addEventListener('mouseleave', (e) => { e.target.style.background = '#1a1a1a'; setCursorHover(false); });

function openDetailView(panel) {
  if (isDetailView) return;
  isDetailView = true;
  selectedPanel = panel;
  selectedCreatorIndex = panel.userData.creatorIndex;

  document.getElementById('detail-creator-name').textContent = panel.userData.creatorName;
  document.getElementById('detail-project-name').textContent = panel.userData.projectName;

  const creatorGroup = creatorGroups[selectedCreatorIndex];
  const targetPos = creatorGroup.position.clone();

  gsap.to(camera.position, {
    x: targetPos.x,
    y: targetPos.y,
    z: 12,
    duration: 1.0,
    ease: 'power3.inOut'
  });

  // Blur non-selected spheres (keep textures visible)
  creatorGroups.forEach((g, i) => {
    if (i !== selectedCreatorIndex) {
      gsap.to(g.position, { z: -5, duration: 0.8, ease: 'power2.in' });
      sphereMeshGroups[i].children.forEach(child => {
        if (child.children) {
          child.children.forEach(m => {
            if (m.material && m.material.transparent !== undefined) {
              m.material.transparent = true;
              gsap.to(m.material, { opacity: 0.3, duration: 0.6 });
            }
          });
        }
        if (child.material) {
          child.material.transparent = true;
          gsap.to(child.material, { opacity: 0.3, duration: 0.6 });
        }
      });
      nameLabels[i].style.opacity = '0';
      nameLabels[i].style.filter = 'blur(8px)';
    }
  });

  // Hide selected sphere's name label
  nameLabels[selectedCreatorIndex].style.opacity = '0';

  setTimeout(() => {
    creatorInfoPanel.style.opacity = '1';
    creatorInfoPanel.style.pointerEvents = 'auto';
    projectInfoPanel.style.opacity = '1';
    projectInfoPanel.style.pointerEvents = 'auto';
  }, 500);

  const instr = document.getElementById('instructions');
  if (instr) instr.style.opacity = '0';
}

function updateDetailProject(panel) {
  selectedPanel = panel;
  document.getElementById('detail-project-name').textContent = panel.userData.projectName;
}

function returnToOverview() {
  if (!isDetailView) return;
  isDetailView = false;

  creatorInfoPanel.style.opacity = '0';
  creatorInfoPanel.style.pointerEvents = 'none';
  projectInfoPanel.style.opacity = '0';
  projectInfoPanel.style.pointerEvents = 'none';

  gsap.to(camera.position, {
    x: baseCameraPos.x + cameraPanOffset.x,
    y: baseCameraPos.y + cameraPanOffset.y,
    z: baseCameraPos.z,
    duration: 1.0,
    ease: 'power3.inOut'
  });

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
    nameLabels[i].style.filter = 'blur(0px)';
  });

  const instr = document.getElementById('instructions');
  if (instr) instr.style.opacity = '0.8';

  selectedPanel = null;
  selectedCreatorIndex = -1;
}

// Click — only if not dragged AND not panning
renderer.domElement.addEventListener('click', (event) => {
  if (controller.hasDragged) return;
  if (controller.wasPanning) return;

  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  if (isDetailView) {
    // In detail view: click panel on selected sphere to switch project, click elsewhere to close
    raycaster.setFromCamera(mouse, camera);
    const selectedObjects = sphereMeshGroups[selectedCreatorIndex].children.flatMap(c => c.children || [c]);
    const intersects = raycaster.intersectObjects(selectedObjects, true);
    const hit = findFrontFacingPanel(intersects);
    if (hit) {
      updateDetailProject(hit.panel);
    } else {
      returnToOverview();
    }
    return;
  }

  raycaster.setFromCamera(mouse, camera);
  const allObjects = sphereMeshGroups.flatMap(sg => sg.children.flatMap(c => c.children || [c]));
  const intersects = raycaster.intersectObjects(allObjects, true);
  const hit = findFrontFacingPanel(intersects);

  if (hit) {
    openDetailView(hit.panel);
  }
});

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
// POST-PROCESSING: Film Grain/CA + Bloom
// ============================================================
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

// Bloom
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.0,   // strength (disabled)
  0.4,   // radius
  0.95   // threshold
);
composer.addPass(bloomPass);

const filmGrainCA = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    grainIntensity: { value: 0.018 },
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

  controller.update();
  updateCursor();

  // Floating / breathing animation — each sphere bobbles with unique phase
  creatorGroups.forEach((group, i) => {
    const phase = i * 1.3;
    const floatY = Math.sin(time * 0.8 + phase) * 0.15;
    group.position.y = group.userData.baseY + floatY;

    // Apply magnetic hover tilt (smooth lerp)
    const tilt = hoverTilts[i];
    group.rotation.x += (tilt.x - group.rotation.x) * 0.08;
    group.rotation.y += (tilt.y - group.rotation.y) * 0.08;
  });

  // Update iridescent shader time
  iridescentMeshes.forEach(mat => { mat.uniforms.time.value = time; });

  // Camera
  if (!isDetailView) {
    camera.position.x = baseCameraPos.x + cameraPanOffset.x + mouseX * 0.4;
    camera.position.y = baseCameraPos.y + cameraPanOffset.y - mouseY * 0.3;
    camera.position.z += (baseCameraPos.z - camera.position.z) * 0.08;
    camera.lookAt(cameraPanOffset.x, cameraPanOffset.y, 0);
  } else {
    const target = creatorGroups[selectedCreatorIndex]?.position || new THREE.Vector3();
    camera.lookAt(target.x, target.y, 0);
  }

  updateNameLabels();

  filmGrainPass.uniforms.time.value = time;
  composer.render();
}

animate();
