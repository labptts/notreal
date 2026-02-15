import './style.css'
import * as THREE from 'three'
import gsap from 'gsap'

// Scene, Camera, Renderer setup
const canvas = document.getElementById('canvas')
const scene = new THREE.Scene()

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
)
camera.position.set(0, 0, 25)

const renderer = new THREE.WebGLRenderer({ 
  canvas,
  antialias: true,
  alpha: true
})
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
directionalLight.position.set(10, 10, 10)
scene.add(directionalLight)

// Background - Stars
function createStarField() {
  const starGeometry = new THREE.BufferGeometry()
  const starCount = 2000
  const positions = new Float32Array(starCount * 3)
  
  for (let i = 0; i < starCount * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 100
  }
  
  starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const starMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.1,
    transparent: true,
    opacity: 0.8
  })
  
  const stars = new THREE.Points(starGeometry, starMaterial)
  scene.add(stars)
  
  return stars
}

const starField = createStarField()

// Core Group - Container for all panels
const coreGroup = new THREE.Group()
scene.add(coreGroup)

// Panel creation with Fibonacci sphere distribution
const panels = []
const PANEL_COUNT = 20
const SPHERE_RADIUS = 10

function fibonacciSphere(samples, radius) {
  const points = []
  const phi = Math.PI * (3 - Math.sqrt(5)) // Golden angle
  
  for (let i = 0; i < samples; i++) {
    const y = 1 - (i / (samples - 1)) * 2
    const radiusAtY = Math.sqrt(1 - y * y)
    const theta = phi * i
    
    const x = Math.cos(theta) * radiusAtY
    const z = Math.sin(theta) * radiusAtY
    
    points.push({
      x: x * radius,
      y: y * radius,
      z: z * radius
    })
  }
  
  return points
}

// Create video texture
function createVideoTexture() {
  const video = document.createElement('video')
  video.src = '/preview.mp4'
  video.loop = true
  video.muted = true
  video.playsInline = true
  video.crossOrigin = 'anonymous'
  
  // Try to play, but handle if video doesn't exist
  video.play().catch(() => {
    console.log('Video not found, using placeholder color')
  })
  
  const texture = new THREE.VideoTexture(video)
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  
  return texture
}

// Create panels
const positions = fibonacciSphere(PANEL_COUNT, SPHERE_RADIUS)

positions.forEach((pos, index) => {
  const geometry = new THREE.PlaneGeometry(4, 5)
  const videoTexture = createVideoTexture()
  
  const material = new THREE.MeshStandardMaterial({
    map: videoTexture,
    side: THREE.DoubleSide,
    emissive: 0x222222,
    emissiveIntensity: 0.2
  })
  
  const panel = new THREE.Mesh(geometry, material)
  panel.position.set(pos.x, pos.y, pos.z)
  
  // Make panel face outward from center
  panel.lookAt(0, 0, 0)
  panel.rotateY(Math.PI)
  
  panel.userData = { 
    id: index,
    originalScale: 1,
    originalEmissiveIntensity: 0.2
  }
  
  coreGroup.add(panel)
  panels.push(panel)
})

// Rotation control with inertia
let isDragging = false
let previousMousePosition = { x: 0, y: 0 }
let rotationVelocity = { x: 0, y: 0 }
const dampingFactor = 0.95
const rotationSpeed = 0.005

// Mouse/Touch event handlers
function onPointerDown(event) {
  isDragging = true
  const clientX = event.touches ? event.touches[0].clientX : event.clientX
  const clientY = event.touches ? event.touches[0].clientY : event.clientY
  previousMousePosition = { x: clientX, y: clientY }
  rotationVelocity = { x: 0, y: 0 }
}

function onPointerMove(event) {
  if (!isDragging) return
  
  const clientX = event.touches ? event.touches[0].clientX : event.clientX
  const clientY = event.touches ? event.touches[0].clientY : event.clientY
  
  const deltaX = clientX - previousMousePosition.x
  const deltaY = clientY - previousMousePosition.y
  
  rotationVelocity.x = deltaY * rotationSpeed
  rotationVelocity.y = deltaX * rotationSpeed
  
  coreGroup.rotation.x += rotationVelocity.x
  coreGroup.rotation.y += rotationVelocity.y
  
  previousMousePosition = { x: clientX, y: clientY }
}

function onPointerUp() {
  isDragging = false
}

// Add event listeners
canvas.addEventListener('mousedown', onPointerDown)
canvas.addEventListener('mousemove', onPointerMove)
canvas.addEventListener('mouseup', onPointerUp)
canvas.addEventListener('touchstart', onPointerDown, { passive: true })
canvas.addEventListener('touchmove', onPointerMove, { passive: true })
canvas.addEventListener('touchend', onPointerUp)

// Raycasting for selection
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
let selectedPanel = null

function onCanvasClick(event) {
  // Get mouse position in normalized device coordinates
  const clientX = event.touches ? event.touches[0].clientX : event.clientX
  const clientY = event.touches ? event.touches[0].clientY : event.clientY
  
  mouse.x = (clientX / window.innerWidth) * 2 - 1
  mouse.y = -(clientY / window.innerHeight) * 2 + 1
  
  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects(panels)
  
  if (intersects.length > 0) {
    const clickedPanel = intersects[0].object
    selectPanel(clickedPanel)
  }
}

function selectPanel(panel) {
  console.log(`Selected Creator ID: ${panel.userData.id}`)
  
  // Reset previous selection
  if (selectedPanel) {
    gsap.to(selectedPanel.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 0.5,
      ease: 'power2.out'
    })
    gsap.to(selectedPanel.material, {
      emissiveIntensity: 0.2,
      duration: 0.5
    })
  }
  
  selectedPanel = panel
  
  // Highlight selected panel
  gsap.to(panel.scale, {
    x: 1.2,
    y: 1.2,
    z: 1.2,
    duration: 0.5,
    ease: 'power2.out'
  })
  
  gsap.to(panel.material, {
    emissiveIntensity: 0.5,
    duration: 0.5
  })
  
  // Dim other panels
  panels.forEach(p => {
    if (p !== panel) {
      gsap.to(p.material, {
        emissiveIntensity: 0.1,
        duration: 0.5
      })
    }
  })
  
  // Rotate core to face the camera with the selected panel
  const panelWorldPosition = new THREE.Vector3()
  panel.getWorldPosition(panelWorldPosition)
  
  // Calculate rotation needed to face the panel forward
  const targetRotation = new THREE.Euler()
  const lookAtMatrix = new THREE.Matrix4()
  lookAtMatrix.lookAt(panelWorldPosition, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0))
  targetRotation.setFromRotationMatrix(lookAtMatrix)
  
  gsap.to(coreGroup.rotation, {
    x: -targetRotation.x,
    y: -targetRotation.y + Math.PI,
    duration: 1.5,
    ease: 'power2.inOut'
  })
}

canvas.addEventListener('click', onCanvasClick)
canvas.addEventListener('touchend', onCanvasClick)

// Handle window resize
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
}

window.addEventListener('resize', onWindowResize)

// Animation loop
function animate() {
  requestAnimationFrame(animate)
  
  // Apply inertia when not dragging
  if (!isDragging) {
    coreGroup.rotation.x += rotationVelocity.x
    coreGroup.rotation.y += rotationVelocity.y
    
    rotationVelocity.x *= dampingFactor
    rotationVelocity.y *= dampingFactor
  }
  
  // Slowly rotate star field
  starField.rotation.y += 0.0001
  
  renderer.render(scene, camera)
}

animate()
