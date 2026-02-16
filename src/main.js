import './style.css';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// ============================================================
// MOBILE DETECTION
// ============================================================
const isMobile = ('ontouchstart' in window) || (window.innerWidth < 768);

// ============================================================
// CUSTOM CURSOR (inversion circle) — desktop only
// ============================================================
let cursorEl = null;
if (!isMobile) {
  cursorEl = document.createElement('div');
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
}

let cursorX = 0, cursorY = 0, cursorTargetX = 0, cursorTargetY = 0;
document.addEventListener('mousemove', (e) => {
  cursorTargetX = e.clientX;
  cursorTargetY = e.clientY;
});
function updateCursor() {
  if (!cursorEl) return;
  cursorX += (cursorTargetX - cursorX) * 0.15;
  cursorY += (cursorTargetY - cursorY) * 0.15;
  cursorEl.style.left = cursorX + 'px';
  cursorEl.style.top = cursorY + 'px';
}
function setCursorHover(isHover) {
  if (!cursorEl) return;
  const s = isHover ? '48px' : '32px';
  cursorEl.style.width = s;
  cursorEl.style.height = s;
}

// ============================================================
// SCENE SETUP — white background
// ============================================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

// Fog for depth haze (very subtle)
scene.fog = new THREE.FogExp2(0xffffff, 0.004);

const camera = new THREE.PerspectiveCamera(isMobile ? 55 : 45, window.innerWidth / window.innerHeight, 0.1, 1000);
const baseCameraZ = isMobile ? 16 : 22;
camera.position.set(0, 0, baseCameraZ);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = false;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
document.querySelector('#app').appendChild(renderer.domElement);

// ============================================================
// LIGHTING
// ============================================================
scene.add(new THREE.AmbientLight(0xffffff, 0.4));

const keyLight = new THREE.DirectionalLight(0xfff8f0, 0.7);
keyLight.position.set(8, 10, 8);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xe0e8ff, 0.4);
fillLight.position.set(-10, 3, 5);
scene.add(fillLight);

// Colored accent rim lights for CG-quality separation
const rimLightWarm = new THREE.DirectionalLight(0xffccaa, 0.25);
rimLightWarm.position.set(5, -3, -10);
scene.add(rimLightWarm);

const rimLightCool = new THREE.DirectionalLight(0xaaccff, 0.25);
rimLightCool.position.set(-5, -3, -10);
scene.add(rimLightCool);

// Subtle top-down accent
const topAccent = new THREE.PointLight(0xffeef5, 0.3, 30);
topAccent.position.set(0, 12, 5);
scene.add(topAccent);

// ============================================================
// ENVIRONMENT MAP
// ============================================================
const pmremGenerator = new THREE.PMREMGenerator(renderer);
const envScene = new THREE.Scene();

function createStudioEnvTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  const w = 2048, h = 1024;

  // Rich gradient sky dome
  const baseGrad = ctx.createLinearGradient(0, 0, 0, h);
  baseGrad.addColorStop(0, '#f8f4f0');
  baseGrad.addColorStop(0.15, '#ffffff');
  baseGrad.addColorStop(0.35, '#f5f6fa');
  baseGrad.addColorStop(0.5, '#eaecf2');
  baseGrad.addColorStop(0.65, '#e0e3eb');
  baseGrad.addColorStop(0.8, '#d0d4de');
  baseGrad.addColorStop(1, '#b8bcc8');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, w, h);

  // Key light softbox — bright, large (upper right)
  const key1 = ctx.createRadialGradient(1500, 180, 0, 1500, 180, 350);
  key1.addColorStop(0, 'rgba(255, 253, 248, 0.95)');
  key1.addColorStop(0.2, 'rgba(255, 250, 240, 0.7)');
  key1.addColorStop(0.5, 'rgba(255, 248, 235, 0.3)');
  key1.addColorStop(1, 'rgba(255, 245, 230, 0)');
  ctx.fillStyle = key1;
  ctx.fillRect(0, 0, w, h);

  // Secondary softbox (upper left)
  const key2 = ctx.createRadialGradient(400, 220, 0, 400, 220, 280);
  key2.addColorStop(0, 'rgba(220, 230, 255, 0.8)');
  key2.addColorStop(0.3, 'rgba(220, 230, 255, 0.4)');
  key2.addColorStop(0.6, 'rgba(215, 225, 255, 0.15)');
  key2.addColorStop(1, 'rgba(210, 220, 255, 0)');
  ctx.fillStyle = key2;
  ctx.fillRect(0, 0, w, h);

  // Rim accent (warm, behind — lower area)
  const rim1 = ctx.createRadialGradient(1800, 600, 0, 1800, 600, 400);
  rim1.addColorStop(0, 'rgba(255, 220, 180, 0.5)');
  rim1.addColorStop(0.4, 'rgba(255, 210, 160, 0.2)');
  rim1.addColorStop(1, 'rgba(255, 200, 150, 0)');
  ctx.fillStyle = rim1;
  ctx.fillRect(0, 0, w, h);

  // Cool accent (left side)
  const cool = ctx.createRadialGradient(100, 500, 0, 100, 500, 350);
  cool.addColorStop(0, 'rgba(180, 200, 255, 0.4)');
  cool.addColorStop(0.5, 'rgba(180, 200, 255, 0.15)');
  cool.addColorStop(1, 'rgba(180, 200, 255, 0)');
  ctx.fillStyle = cool;
  ctx.fillRect(0, 0, w, h);

  // Bright specular highlight spots (simulate window reflections)
  const spots = [
    { x: 1400, y: 140, r: 80, a: 0.9 },
    { x: 1550, y: 200, r: 60, a: 0.7 },
    { x: 600, y: 160, r: 70, a: 0.6 },
    { x: 1000, y: 100, r: 50, a: 0.5 },
    { x: 300, y: 300, r: 90, a: 0.4 },
  ];
  spots.forEach(s => {
    const sg = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
    sg.addColorStop(0, `rgba(255, 255, 255, ${s.a})`);
    sg.addColorStop(0.3, `rgba(255, 255, 252, ${s.a * 0.5})`);
    sg.addColorStop(1, 'rgba(255, 255, 250, 0)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, w, h);
  });

  // Subtle horizontal gradient bands (simulate studio panels)
  for (let i = 0; i < 6; i++) {
    const yy = 80 + i * 160;
    const band = ctx.createLinearGradient(0, yy - 40, 0, yy + 40);
    band.addColorStop(0, 'rgba(255,255,255,0)');
    band.addColorStop(0.5, `rgba(255,255,255,${0.08 + Math.random() * 0.06})`);
    band.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = band;
    ctx.fillRect(0, yy - 40, w, 80);
  }

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

// Responsive layout: pyramid on desktop, compact grid on mobile
const sphereRadius = isMobile ? 1.6 : 2.6;
const spacingX = isMobile ? 4.2 : 6.8;
const spacingY = isMobile ? 4.6 : 6.8;
const creatorPositions = isMobile ? [
  // Mobile: 2-1-2 quincunx layout
  new THREE.Vector3(-spacingX * 0.5, spacingY * 0.8, 0),
  new THREE.Vector3(spacingX * 0.5, spacingY * 0.8, 0),
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(-spacingX * 0.5, -spacingY * 0.8, 0),
  new THREE.Vector3(spacingX * 0.5, -spacingY * 0.8, 0),
] : [
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
// Glass overlay material is created inline during sphere construction

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
const glassMeshes = []; // glass overlay meshes

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

  // Inner sphere — subtle dark backing for depth
  const innerGeo = new THREE.SphereGeometry(sphereRadius - 0.02, 64, 64);
  const innerMat = new THREE.MeshPhysicalMaterial({
    color: 0xf0f0f0,
    side: THREE.FrontSide,
    roughness: 0.6,
    metalness: 0.05,
    envMapIntensity: 0.3
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
      roughness: 0.08,
      metalness: 0.03,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      envMapIntensity: 0.8,
      reflectivity: 0.5,
      envMapRotation: new THREE.Euler(0, ci * Math.PI * 0.4, 0),
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
      color: 0xffffff,
      side: THREE.BackSide,
      roughness: 0.9,
      metalness: 0.0
    });
    const backPanel = new THREE.Mesh(backGeo, backMat);
    cardGroup.add(backPanel);

    // Side walls for thickness when panel pops out
    const edgeThickness = 0.08;
    const edgeMat = new THREE.MeshPhysicalMaterial({
      color: 0xe0e0e0,
      side: THREE.DoubleSide,
      roughness: 0.3,
      metalness: 0.05
    });
    // Create edge strips along all 4 borders of the panel
    const edgeSegs = 32;
    // Top edge
    const topEdgeGeo = new THREE.BufferGeometry();
    const topVerts = [], topNorms = [], topIdx = [];
    for (let x = 0; x <= edgeSegs; x++) {
      const u = x / edgeSegs;
      const theta = config.thetaStart + u * config.thetaLength;
      const phi = config.phiStart;
      const outerR = sphereRadius;
      const innerR = sphereRadius - edgeThickness;
      topVerts.push(outerR*Math.sin(phi)*Math.cos(theta), outerR*Math.cos(phi), outerR*Math.sin(phi)*Math.sin(theta));
      topVerts.push(innerR*Math.sin(phi)*Math.cos(theta), innerR*Math.cos(phi), innerR*Math.sin(phi)*Math.sin(theta));
      const n = new THREE.Vector3(Math.sin(phi)*Math.cos(theta), Math.cos(phi), Math.sin(phi)*Math.sin(theta)).normalize();
      topNorms.push(n.x, n.y, n.z, n.x, n.y, n.z);
    }
    for (let x = 0; x < edgeSegs; x++) {
      const a = x*2, b = a+1, c = a+2, d = a+3;
      topIdx.push(a,c,b, b,c,d);
    }
    topEdgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(topVerts, 3));
    topEdgeGeo.setAttribute('normal', new THREE.Float32BufferAttribute(topNorms, 3));
    topEdgeGeo.setIndex(topIdx);
    cardGroup.add(new THREE.Mesh(topEdgeGeo, edgeMat));
    // Bottom edge
    const botEdgeGeo = new THREE.BufferGeometry();
    const botVerts = [], botNorms = [], botIdx = [];
    for (let x = 0; x <= edgeSegs; x++) {
      const u = x / edgeSegs;
      const theta = config.thetaStart + u * config.thetaLength;
      const phi = config.phiStart + config.phiLength;
      const outerR = sphereRadius;
      const innerR = sphereRadius - edgeThickness;
      botVerts.push(outerR*Math.sin(phi)*Math.cos(theta), outerR*Math.cos(phi), outerR*Math.sin(phi)*Math.sin(theta));
      botVerts.push(innerR*Math.sin(phi)*Math.cos(theta), innerR*Math.cos(phi), innerR*Math.sin(phi)*Math.sin(theta));
      const n = new THREE.Vector3(Math.sin(phi)*Math.cos(theta), Math.cos(phi), Math.sin(phi)*Math.sin(theta)).normalize();
      botNorms.push(n.x, n.y, n.z, n.x, n.y, n.z);
    }
    for (let x = 0; x < edgeSegs; x++) {
      const a = x*2, b = a+1, c = a+2, d = a+3;
      botIdx.push(a,b,c, b,d,c);
    }
    botEdgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(botVerts, 3));
    botEdgeGeo.setAttribute('normal', new THREE.Float32BufferAttribute(botNorms, 3));
    botEdgeGeo.setIndex(botIdx);
    cardGroup.add(new THREE.Mesh(botEdgeGeo, edgeMat));
    // Left edge
    const leftEdgeGeo = new THREE.BufferGeometry();
    const leftVerts = [], leftNorms = [], leftIdx = [];
    for (let y = 0; y <= edgeSegs; y++) {
      const v = y / edgeSegs;
      const phi = config.phiStart + v * config.phiLength;
      const theta = config.thetaStart;
      const outerR = sphereRadius;
      const innerR = sphereRadius - edgeThickness;
      leftVerts.push(outerR*Math.sin(phi)*Math.cos(theta), outerR*Math.cos(phi), outerR*Math.sin(phi)*Math.sin(theta));
      leftVerts.push(innerR*Math.sin(phi)*Math.cos(theta), innerR*Math.cos(phi), innerR*Math.sin(phi)*Math.sin(theta));
      const n = new THREE.Vector3(Math.sin(phi)*Math.cos(theta), Math.cos(phi), Math.sin(phi)*Math.sin(theta)).normalize();
      leftNorms.push(n.x, n.y, n.z, n.x, n.y, n.z);
    }
    for (let y = 0; y < edgeSegs; y++) {
      const a = y*2, b = a+1, c = a+2, d = a+3;
      leftIdx.push(a,b,c, b,d,c);
    }
    leftEdgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(leftVerts, 3));
    leftEdgeGeo.setAttribute('normal', new THREE.Float32BufferAttribute(leftNorms, 3));
    leftEdgeGeo.setIndex(leftIdx);
    cardGroup.add(new THREE.Mesh(leftEdgeGeo, edgeMat));
    // Right edge
    const rightEdgeGeo = new THREE.BufferGeometry();
    const rightVerts = [], rightNorms = [], rightIdx = [];
    for (let y = 0; y <= edgeSegs; y++) {
      const v = y / edgeSegs;
      const phi = config.phiStart + v * config.phiLength;
      const theta = config.thetaStart + config.thetaLength;
      const outerR = sphereRadius;
      const innerR = sphereRadius - edgeThickness;
      rightVerts.push(outerR*Math.sin(phi)*Math.cos(theta), outerR*Math.cos(phi), outerR*Math.sin(phi)*Math.sin(theta));
      rightVerts.push(innerR*Math.sin(phi)*Math.cos(theta), innerR*Math.cos(phi), innerR*Math.sin(phi)*Math.sin(theta));
      const n = new THREE.Vector3(Math.sin(phi)*Math.cos(theta), Math.cos(phi), Math.sin(phi)*Math.sin(theta)).normalize();
      rightNorms.push(n.x, n.y, n.z, n.x, n.y, n.z);
    }
    for (let y = 0; y < edgeSegs; y++) {
      const a = y*2, b = a+1, c = a+2, d = a+3;
      rightIdx.push(a,c,b, b,c,d);
    }
    rightEdgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(rightVerts, 3));
    rightEdgeGeo.setAttribute('normal', new THREE.Float32BufferAttribute(rightNorms, 3));
    rightEdgeGeo.setIndex(rightIdx);
    cardGroup.add(new THREE.Mesh(rightEdgeGeo, edgeMat));

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

  // Glass refraction overlay sphere
  const glassGeo = new THREE.SphereGeometry(sphereRadius + 0.025, 64, 64);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transmission: 0.96,
    thickness: 0.5,
    ior: 1.45,
    roughness: 0.02,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.01,
    envMapIntensity: 0.7,
    reflectivity: 0.9,
    transparent: true,
    opacity: 1.0,
    side: THREE.FrontSide,
    depthWrite: false,
    attenuationDistance: 30.0,
  });
  // Rotate env reflections per sphere for unique highlights
  glassMat.envMapRotation = new THREE.Euler(0, ci * Math.PI * 0.4, 0);
  const glassMesh = new THREE.Mesh(glassGeo, glassMat);
  glassMesh.userData.isGlassOverlay = true;
  sphereGroup.add(glassMesh);
  glassMeshes.push(glassMesh);

  sphereGroup.rotation.y = Math.random() * Math.PI * 2;
  sphereGroup.rotation.x = (Math.random() - 0.5) * 0.3;

  creatorGroups.push(creatorGroup);
  sphereMeshGroups.push(sphereGroup);
});

// ============================================================
// GROUND PLANE + CONTACT SHADOWS + CAUSTICS
// ============================================================

// ---- DARK BOKEH BLOB (amorphous, defocused, parallax) ----
function createBokehBlobTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 512, 512);

  // Main amorphous shape — multiple offset radial gradients blended
  const blobs = [
    { x: 240, y: 260, rx: 200, ry: 180, a: 0.07 },
    { x: 280, y: 230, rx: 170, ry: 210, a: 0.06 },
    { x: 220, y: 280, rx: 160, ry: 150, a: 0.05 },
    { x: 300, y: 250, rx: 130, ry: 170, a: 0.04 },
    { x: 256, y: 256, rx: 220, ry: 220, a: 0.03 },
  ];
  blobs.forEach(b => {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.scale(1, b.ry / b.rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, b.rx);
    g.addColorStop(0, `rgba(15, 15, 20, ${b.a})`);
    g.addColorStop(0.3, `rgba(20, 18, 25, ${b.a * 0.8})`);
    g.addColorStop(0.6, `rgba(25, 22, 30, ${b.a * 0.4})`);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(-b.rx, -b.rx, b.rx * 2, b.rx * 2);
    ctx.restore();
  });

  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

const bokehTex = createBokehBlobTexture();
const bokehGeo = new THREE.PlaneGeometry(80, 80);
const bokehMat = new THREE.MeshBasicMaterial({
  map: bokehTex,
  transparent: true,
  depthWrite: false,
  opacity: 0.3,
});
const bokehMesh = new THREE.Mesh(bokehGeo, bokehMat);
bokehMesh.position.set(3, -1, -20);
bokehMesh.renderOrder = -10;
scene.add(bokehMesh);

// Soft blob shadow under each sphere
function createShadowTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(0, 0, 0, 0.10)');
  g.addColorStop(0.4, 'rgba(0, 0, 0, 0.06)');
  g.addColorStop(0.7, 'rgba(0, 0, 0, 0.02)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}
const shadowTex = createShadowTexture();
const shadowPlanes = [];
creatorGroups.forEach((group, i) => {
  const shadowGeo = new THREE.PlaneGeometry(sphereRadius * 3, sphereRadius * 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.7,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.position.set(
    group.position.x,
    group.position.y - sphereRadius - 0.8,
    group.position.z - 0.1
  );
  shadowMesh.renderOrder = -1;
  scene.add(shadowMesh);
  shadowPlanes.push(shadowMesh);
});

// Caustics texture (animated procedural)
function createCausticsTexture(time) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 512, 512);

  // Draw animated caustic-like patterns
  for (let i = 0; i < 40; i++) {
    const x = (Math.sin(i * 1.7 + time * 0.3) * 0.5 + 0.5) * 512;
    const y = (Math.cos(i * 2.3 + time * 0.2) * 0.5 + 0.5) * 512;
    const r = 15 + Math.sin(i * 3.1 + time * 0.5) * 10;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255, 255, 255, ${0.04 + Math.sin(i + time) * 0.02})`);
    g.addColorStop(0.5, `rgba(240, 245, 255, ${0.02})`);
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);
  }
  return c;
}

const causticsGeo = new THREE.PlaneGeometry(40, 20);
const causticsCanvas = createCausticsTexture(0);
const causticsTexture = new THREE.CanvasTexture(causticsCanvas);
const causticsMat = new THREE.MeshBasicMaterial({
  map: causticsTexture,
  transparent: true,
  depthWrite: false,
  opacity: 0.4,
  blending: THREE.AdditiveBlending,
});
const causticsMesh = new THREE.Mesh(causticsGeo, causticsMat);
causticsMesh.position.set(0, -spacingY * 0.45 - sphereRadius - 1.2, -0.15);
causticsMesh.renderOrder = -2;
scene.add(causticsMesh);

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
    font-size: ${isMobile ? '10' : '13'}px;
    font-weight: 500;
    letter-spacing: ${isMobile ? '1' : '2'}px;
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
    const worldPos = new THREE.Vector3(0, -(sphereRadius + (isMobile ? 0.35 : 0.7)), 0);
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

    // Touch events
    this.lastTouchCount = 0;
    this.pinchStartDist = 0;
    this.pinchStartZoom = 0;

    this.domElement.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (e.touches.length === 2) {
        // Pinch zoom start
        this.lastTouchCount = 2;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        this.pinchStartDist = Math.sqrt(dx * dx + dy * dy);
        this.pinchStartZoom = baseCameraPos.z;
        return;
      }
      this.lastTouchCount = 1;
      this.onDown(e.touches[0]);
    }, { passive: false });
    this.domElement.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length === 2) {
        // Pinch zoom move
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const scale = this.pinchStartDist / dist;
        baseCameraPos.z = THREE.MathUtils.clamp(
          this.pinchStartZoom * scale, ZOOM_MIN, ZOOM_MAX
        );
        return;
      }
      this.onMove(e.touches[0]);
    }, { passive: false });
    this.domElement.addEventListener('touchend', (e) => {
      if (this.lastTouchCount === 2 && e.touches.length < 2) {
        this.lastTouchCount = e.touches.length;
        return;
      }
      this.lastTouchCount = e.touches.length;
      this.onUp();
    });
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
    // Tap detection for touch devices — emulate click if no drag
    if (isMobile && !this.hasDragged && this.startMouse.x !== 0) {
      this._handleTap(this.startMouse);
    }
    this.isRotatingSphere = false;
    this.activeSphere = null;
    this.isPanning = false;
  }

  _handleTap(coords) {
    const rect = this.domElement.getBoundingClientRect();
    const mx = ((coords.x - rect.left) / rect.width) * 2 - 1;
    const my = -((coords.y - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(new THREE.Vector2(mx, my), camera);

    if (isDetailView) {
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

    const allObjects = sphereMeshGroups.flatMap(sg => sg.children.flatMap(c => c.children || [c]));
    const intersects = raycaster.intersectObjects(allObjects, true);
    const hit = findFrontFacingPanel(intersects);
    if (hit) {
      // Touch highlight feedback
      gsap.to(hit.panel.scale, { x: 1.1, y: 1.1, z: 1.1, duration: 0.15, ease: 'power2.out',
        onComplete: () => gsap.to(hit.panel.scale, { x: 1, y: 1, z: 1, duration: 0.15 })
      });
      openDetailView(hit.panel);
    }
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
    // Skip glass overlay
    if (intersect.object.userData && intersect.object.userData.isGlassOverlay) continue;
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
// LEFT / BOTTOM: Creator info panel
const creatorInfoPanel = document.createElement('div');
creatorInfoPanel.id = 'creator-info-panel';
creatorInfoPanel.style.cssText = isMobile ? `
  position: fixed; left: 20px; bottom: 100px; right: 20px;
  padding: 0;
  z-index: 100; opacity: 0; pointer-events: none;
  transition: opacity 0.5s ease;
  font-family: 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
  text-align: center;
` : `
  position: fixed; left: 60px; top: 50%; transform: translateY(-50%);
  width: 280px; padding: 0;
  z-index: 100; opacity: 0; pointer-events: none;
  transition: opacity 0.5s ease;
  font-family: 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
`;
creatorInfoPanel.innerHTML = `
  <div style="font-size: ${isMobile ? '22' : '28'}px; font-weight: 600; color: #1a1a1a; margin-bottom: 8px;" id="detail-creator-name"></div>
  <div style="font-size: ${isMobile ? '12' : '14'}px; color: #666; line-height: 1.6;">создает ии-ролики и ии-фотографии красиво</div>
`;
document.body.appendChild(creatorInfoPanel);

// RIGHT / BOTTOM: Project info panel
const projectInfoPanel = document.createElement('div');
projectInfoPanel.id = 'project-info-panel';
projectInfoPanel.style.cssText = isMobile ? `
  position: fixed; left: 20px; bottom: 20px; right: 20px;
  padding: 20px 24px;
  background: rgba(255,255,255,0.92); backdrop-filter: blur(20px);
  border-radius: 16px; z-index: 100; opacity: 0; pointer-events: none;
  transition: opacity 0.5s ease;
  font-family: 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
  box-shadow: 0 4px 24px rgba(0,0,0,0.1);
  display: flex; align-items: center; justify-content: space-between;
` : `
  position: fixed; right: 60px; top: 50%; transform: translateY(-50%);
  width: 280px; padding: 40px;
  background: rgba(255,255,255,0.92); backdrop-filter: blur(20px);
  border-radius: 16px; z-index: 100; opacity: 0; pointer-events: none;
  transition: opacity 0.5s ease;
  font-family: 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
  box-shadow: 0 8px 32px rgba(0,0,0,0.1);
`;
projectInfoPanel.innerHTML = isMobile ? `
  <div>
    <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #999; margin-bottom: 4px;">Проект</div>
    <div style="font-size: 20px; font-weight: 600; color: #1a1a1a;" id="detail-project-name"></div>
  </div>
  <button id="detail-close" style="
    background: #1a1a1a; color: white; border: none; padding: 10px 20px; border-radius: 8px;
    font-size: 13px; cursor: pointer; font-family: inherit; letter-spacing: 1px;
  ">Close</button>
` : `
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

  // Highlight selected panel
  gsap.to(panel.scale, { x: 1.08, y: 1.08, z: 1.08, duration: 0.3, ease: 'power2.out' });
  panel.children.forEach(child => {
    if (child.material && child.material.emissive) {
      child.material.emissive.set(0xffffff);
      gsap.to(child.material, { emissiveIntensity: 0.12, duration: 0.3 });
    }
  });

  gsap.to(camera.position, {
    x: targetPos.x,
    y: isMobile ? targetPos.y + 1.5 : targetPos.y,
    z: isMobile ? 9 : 12,
    duration: 1.0,
    ease: 'power3.inOut'
  });

  // Hide non-selected spheres completely
  creatorGroups.forEach((g, i) => {
    if (i !== selectedCreatorIndex) {
      gsap.to(g.position, { z: -8, duration: 0.8, ease: 'power2.in', onComplete: () => {
        g.visible = false;
      }});
      // Immediately start fading
      sphereMeshGroups[i].children.forEach(child => {
        if (child.children) {
          child.children.forEach(m => {
            if (m.material && m.material.transparent !== undefined) {
              m.material.transparent = true;
              gsap.to(m.material, { opacity: 0, duration: 0.5 });
            }
          });
        }
        if (child.material) {
          child.material.transparent = true;
          gsap.to(child.material, { opacity: 0, duration: 0.5 });
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
  // Reset previous selected panel
  if (selectedPanel && selectedPanel !== panel) {
    gsap.to(selectedPanel.scale, { x: 1, y: 1, z: 1, duration: 0.3, ease: 'power2.out' });
    selectedPanel.children.forEach(child => {
      if (child.material && child.material.emissive) {
        gsap.to(child.material, { emissiveIntensity: 0, duration: 0.3 });
      }
    });
  }
  selectedPanel = panel;
  document.getElementById('detail-project-name').textContent = panel.userData.projectName;
  // Highlight new panel
  gsap.to(panel.scale, { x: 1.08, y: 1.08, z: 1.08, duration: 0.3, ease: 'power2.out' });
  panel.children.forEach(child => {
    if (child.material && child.material.emissive) {
      child.material.emissive.set(0xffffff);
      gsap.to(child.material, { emissiveIntensity: 0.12, duration: 0.3 });
    }
  });
}

function returnToOverview() {
  if (!isDetailView) return;
  isDetailView = false;

  // Reset selected panel highlight
  if (selectedPanel) {
    gsap.to(selectedPanel.scale, { x: 1, y: 1, z: 1, duration: 0.3, ease: 'power2.out' });
    selectedPanel.children.forEach(child => {
      if (child.material && child.material.emissive) {
        gsap.to(child.material, { emissiveIntensity: 0, duration: 0.3 });
      }
    });
  }

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
    g.visible = true;
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
  0.12,  // strength — subtle glow on highlights
  0.6,   // radius
  0.85   // threshold
);
composer.addPass(bloomPass);

const filmGrainCA = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    grainIntensity: { value: 0.038 },
    caOffset: { value: 0.0008 }
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

// Vignette pass
const vignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    intensity: { value: 0.35 },
    smoothness: { value: 0.4 },
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
    uniform float intensity;
    uniform float smoothness;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      vec2 uv = vUv;
      uv *= 1.0 - uv.yx;
      float vig = uv.x * uv.y * 15.0;
      vig = pow(vig, smoothness);
      color.rgb = mix(color.rgb * (1.0 - intensity), color.rgb, vig);
      gl_FragColor = color;
    }
  `
};
const vignettePass = new ShaderPass(vignetteShader);
composer.addPass(vignettePass);

// ============================================================
// ANIMATION LOOP
// ============================================================
let time = 0;

function animate() {
  requestAnimationFrame(animate);
  time += 0.016;

  controller.update();
  updateCursor();

  // Floating / breathing animation — each sphere with unique phase
  creatorGroups.forEach((group, i) => {
    const phase = i * 1.3;
    const floatY = Math.sin(time * 0.7 + phase) * 0.18;
    const floatX = Math.cos(time * 0.5 + phase * 1.7) * 0.06;
    group.position.y = group.userData.baseY + floatY;
    group.position.x = creatorPositions[i].x + floatX;

    // Subtle scale breathing
    const breathe = 1.0 + Math.sin(time * 0.9 + phase * 2.1) * 0.012;
    group.scale.setScalar(breathe);

    // Apply magnetic hover tilt (smooth lerp)
    const tilt = hoverTilts[i];
    group.rotation.x += (tilt.x - group.rotation.x) * 0.08;
    group.rotation.y += (tilt.y - group.rotation.y) * 0.08;

    // Update shadow position to follow sphere
    if (shadowPlanes[i]) {
      shadowPlanes[i].position.x = group.position.x;
      shadowPlanes[i].position.y = group.position.y - sphereRadius - 0.8;
      shadowPlanes[i].material.opacity = 0.5 + floatY * 0.3;
    }
  });

  // Update caustics
  if (Math.floor(time * 8) % 2 === 0) {
    const newCausticsCanvas = createCausticsTexture(time);
    causticsTexture.image = newCausticsCanvas;
    causticsTexture.needsUpdate = true;
  }

  // Bokeh blob parallax — moves opposite to camera, slow & heavy
  bokehMesh.position.x = 3 - mouseX * 1.8;
  bokehMesh.position.y = -1 + mouseY * 1.2;

  // Camera
  if (!isDetailView) {
    camera.position.x = baseCameraPos.x + cameraPanOffset.x + mouseX * 0.7;
    camera.position.y = baseCameraPos.y + cameraPanOffset.y - mouseY * 0.5;
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
