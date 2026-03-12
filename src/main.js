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
  cursorX += (cursorTargetX - cursorX) * 0.55;
  cursorY += (cursorTargetY - cursorY) * 0.55;
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
scene.background = null; // transparent — so blob background canvas shows through

// Fog disabled for sharper visuals
// scene.fog = new THREE.FogExp2(0xffffff, 0.004);

const camera = new THREE.PerspectiveCamera(isMobile ? 55 : 45, window.innerWidth / window.innerHeight, 0.1, 1000);
const baseCameraZ = isMobile ? 16 : 22;
camera.position.set(0, 0, baseCameraZ);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = false;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.4;
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
// TYPOGRAPHY HELPER — non-breaking spaces after short prepositions
// ============================================================
function fixTypography(text) {
  if (!text) return '';
  // Replace space after 1-3 letter Russian prepositions/conjunctions with &nbsp;
  return text.replace(/(\s|^)(и|в|с|к|о|у|а|я|на|за|из|по|не|ни|но|до|от|об|то|же|бы|ли|во|со|ко|как|где|что|при|для|без|под|над|про|это|или|так|уже|ещё|еще)\s/gi, (match, before, word) => {
    return before + word + '\u00A0';
  });
}

// ============================================================
// CREATORS DATA
// ============================================================
const creators = [
  {
    name: 'Дмитрий Фольмер',
    character: '/projects/NR_Follmer.webm',
    background: '/projects/Volmer.webp',
    bio: 'AI-креатор с операторским бэкграундом. Я оператор-постановщик — снимаю рекламу, клипы и кино. Понимаю кадр изнутри: свет, текстура, драматургия, актёры, ритм сцены. Это позволяет создавать AI-изображения выразительными и кинематографичными — и не пропускать «пластилиновую» картинку с фальшивой физикой и мёртвыми актёрами.\nМне близки проекты в реализме — где в основе идея, эмоция и ощущение живого момента.\nРаботаю как с full AI-проектами, так и использую AI для усиления реальных съёмок.',
    projects: [
      { name: 'Action', client: 'Higgsfield', type: 'video', videoUrl: 'https://notreal-projects.s3.eu-north-1.amazonaws.com/NR_DimaFolmer_3.mp4', preview: '/projects/NR_DimaFolmer_3.webp', images: [] },
      { name: 'THE BEST FRIEND', client: 'Personal', type: 'video', videoUrl: 'https://notreal-projects.s3.eu-north-1.amazonaws.com/NR_DimaFolmer_1.mp4', preview: '/projects/NR_DimaFolmer_1.webp', images: [] },
      { name: 'Showreel', client: '', type: 'video', videoUrl: 'https://notreal-projects.s3.eu-north-1.amazonaws.com/NR_DimaFolmer_2.mp4', preview: '/projects/NR_DimaFolmer_2.webp', images: [] },
      { name: 'Showreel', client: '', type: 'video', videoUrl: 'https://notreal-projects.s3.eu-north-1.amazonaws.com/NR_DimaFolmer_2.mp4', preview: '/projects/NR_DimaFolmer_2.webp', images: [] },
    ]
  },
  {
    name: 'Саша Блинов',
    character: '/projects/NR_Blinov.webm',
    background: '/projects/Blinov.webp',
    bio: 'AI-лид с четырехлетним опытом работы в индустрии и глубоким бэкграундом в видеомонтаже. Эксперт в управлении генеративными командами и реализации масштабных коммерческих проектов. На протяжении двух лет создавал знаковые высокобюджетные кейсы в составе студии LAB. Досконально владеет актуальным стеком нейросетей, подбирая самые эффективные инструменты под задачу. Мастерски находит нестандартные креативные пути для реализации сложных технических идей.',
    projects: [
      { name: 'Исполнение желаний', client: 'Т-Банк', type: 'video', videoUrl: 'https://labstudioweb.s3.eu-north-1.amazonaws.com/LAB_Tbank_NewYear.MP4', preview: '/projects/NR_Blinov_Tbank.webp', images: [] },
      { name: 'Супергерои', client: 'Профи.ру', type: 'video', videoUrl: 'https://labstudioweb.s3.eu-north-1.amazonaws.com/Lab_ProfiHeroes.mp4', preview: '/projects/NR_Blinov_Profi.webp', images: [] },
      { name: 'Кварталы для жизни', client: 'Самолет', type: 'video', videoUrl: 'https://labstudioweb.s3.eu-north-1.amazonaws.com/Lab_Samolet_Neigh360.mp4', preview: '/projects/NR_Blinov_Samolet.webp', images: [] },
      { name: 'Raval', client: 'Cupra', type: 'video', videoUrl: 'https://labstudioweb.s3.eu-north-1.amazonaws.com/LAB_Cupra_Raval_2026.mp4', preview: '/projects/NR_Blinov_Cupra.webp', images: [] },
    ]
  },
  {
    name: 'Катя Романова',
    character: '/projects/NR_Romka.webm',
    background: '/projects/Romka.webp',
    bio: 'Режиссёр и ии-креатор. Кате близки живые, точные наблюдения и столкновения очень разных персонажей — странных, неповторимых, но узнаваемых. Любит эстетику Фиби Уоллер-Бридж; ей особенно интересно работать не в чистом реализме, а придумывать свои миры чуть смещённые, с юмором и нервом. Параллельно снимает контент для российских музыкальных артистов (клипы, сниппеты, концерты и разговорные форматы).',
    projects: [
      { name: 'Пушистая реклама', client: 'ОТП Банк', type: 'video', videoUrl: 'https://notreal-projects.s3.eu-north-1.amazonaws.com/NR_Kate_Romanova_OTPbank.mp4', preview: '/projects/NR_Romka_OTP.webp', images: [] },
      { name: 'Микрофон', client: 'Comica', type: 'video', videoUrl: 'https://notreal-projects.s3.eu-north-1.amazonaws.com/NR_Kate_Romanova_Comica.mp4', preview: '/projects/NR_Romka_Comica.webp', images: [] },
      { name: 'Big Game', client: 'Artlist', type: 'video', videoUrl: 'https://notreal-projects.s3.eu-north-1.amazonaws.com/NR_Kate_Romanova_Artlist.mp4', preview: '/projects/NR_Romka_artlist.webp', images: [] },
      { name: 'Jewelry', client: 'Personal', type: 'video', videoUrl: 'https://notreal-projects.s3.eu-north-1.amazonaws.com/NR_Kate_Romanova_Jeweley.mp4', preview: '/projects/NR_Romka_jewelery.webp', images: [] },
    ]
  },
  {
    name: 'Макс Китаев',
    character: '/projects/NR_Max.webm',
    background: '/projects/Kitaev.webp',
    bio: 'Режиссёр и арт-директор. В рекламе более 15 лет и за это время успел поработать в таких агентствах, как Leo Burnett Chicago, TBWA Singapore, BBDO Moscow и Lowe Mullen, перед тем как сосредоточился на создании рекламы в качестве режиссёра и AI-креатора.\nМакс хорошо понимает рекламные процессы и может участвовать в создании продукта начиная со стадии разработки концепции и заканчивая монтажом и цветокоррекцией.\nВ его профессиональном портфолио есть несколько наград: серебро фестиваля Epica, золото Golden Hammer, серебро White Square, бронза New York и Red Apple. Также входил в шорт-листы Cannes Lions и Spikes, был отмечен Online Creativity и публиковался в Lurzer\'s Archive.',
    projects: [
      { name: 'Commercial', client: 'Actimuno', type: 'video', videoUrl: 'https://notreal-projects.s3.eu-north-1.amazonaws.com/NR_Max_Kitaev_Actimuno.mp4', preview: '/projects/NR_Kitaev_Actimuno.webp', images: [] },
      { name: 'Clinking', client: 'SimpleWine', type: 'video', videoUrl: 'https://notreal-projects.s3.eu-north-1.amazonaws.com/NR_Max_Kitaev_SimpleWine2.mp4', preview: '/projects/NR_Kitaev_Simplewine_clinking.webp', images: [] },
      { name: 'Dassai', client: 'SimpleWine', type: 'video', videoUrl: 'https://notreal-projects.s3.eu-north-1.amazonaws.com/NR_Max_Kitaev_SimpleWine.mp4', preview: '/projects/NR_Kitaev_Simplewine_dassai.webp', images: [] },
      { name: 'Manezh', client: 'Prefab', type: 'video', videoUrl: 'https://notreal-projects.s3.eu-north-1.amazonaws.com/NR_Max_Kitaev_Prefab.mp4', preview: '/projects/NR_Kitaev_Prefab.webp', images: [] },
    ]
  },
  {
    name: 'Саша GEX',
    character: '/projects/NR_GEX.webm',
    background: '/projects/GEX.webp',
    bio: 'Режиссёр, продюсер и ИИ-креатор полного цикла с глубокой экспертизой в VFX, CGI и генеративных технологиях. Начинал с музыкальных клипов для артистов уровня «Грэмми», сейчас работает в рекламе и сериалах с топовыми именами индустрии. Лично участвует на каждом этапе — от формирования визуальной концепции и написания сценария до организации съёмочного процесса и финального монтажа. Одним из первых в России освоил и применил технологию виртуального продакшена, а сейчас активно работает с киношным ИИ, закладывая использование нейросетей и CGI ещё на стадии раскадровки.\nМастерски находит нестандартные технические решения для реализации сложных визуальных идей — чем амбициознее задача, тем сильнее результат. Комплексное понимание всех этапов видеопроизводства и бескомпромиссный подход к правдоподобности визуала — его главное конкурентное преимущество.',
    projects: [
      { name: 'Twin pizza', client: 'Personal', type: 'video', videoUrl: 'https://notreal-projects.s3.eu-north-1.amazonaws.com/NR_Sasha_GEX_TwinPizza.mp4', preview: '/projects/NR_GEX_TwinPizza.webp', images: [] },
      { name: 'Серия 1', client: 'Начальник голубей', type: 'video', videoUrl: 'https://notreal-projects.s3.eu-north-1.amazonaws.com/NR_Sasha_GEX_HeadofPigeons.mp4', preview: '/projects/NR_GEX_HeadofPigeons.webp', images: [] },
      { name: 'Burgers', client: 'Personal', type: 'video', videoUrl: 'https://notreal-projects.s3.eu-north-1.amazonaws.com/NR_Sasha_GEX_Burger.mp4', preview: '/projects/NR_GEX_Burger2.webp', images: [] },
      { name: 'Space', client: 'Personal', type: 'video', videoUrl: 'https://notreal-projects.s3.eu-north-1.amazonaws.com/NR_Sasha_GEX_SpaceUp.mp4', preview: '/projects/NR_GEX_Space.webp', images: [] },
    ]
  },
  {
    name: 'Black April',
    character: '',
    background: '',
    bio: 'Продакшен-студия на стыке AI, CG и визуальных технологий. Создаёт AI-видео, рекламные ролики, клипы, digital-контент и уникальные визуальные миры для брендов и агентств. Использует нейросети как полноценный продакшен-инструмент, совмещая их с 3D-графикой, VFX, motion-дизайном и композитингом для управляемого и качественного результата. Закрывает полный цикл — от креативной концепции и визуального языка до финальной сборки и постпродакшена. Реализует медиа-арт проекты, инсталляции и интерактивные решения. В портфолио — кейсы для Сбера, Яндекса, Ozon и клипы для топовых артистов, неоднократно входившие в топ лучших работ года. Подключается на любом этапе, усиливая как AI-направление, так и классический продакшн.',
    projects: [
      { name: 'SQWOZ BAB', client: 'Tornado', type: 'video', videoUrl: 'https://notreal-projects.s3.eu-north-1.amazonaws.com/NR_BlackApril_Tornado.mp4', preview: '/projects/NR_BlackApril_Tornado.webp', images: [] },
      { name: 'Космос', client: 'Sber', type: 'video', videoUrl: 'https://notreal-projects.s3.eu-north-1.amazonaws.com/NR_BlackApril_Sber.mp4', preview: '/projects/NR_BlackApril_Sber.webp', images: [] },
      { name: 'Big lips', client: 'Stellary', type: 'video', videoUrl: 'https://notreal-projects.s3.eu-north-1.amazonaws.com/NR_BlackApril_Stellary.mp4', preview: '/projects/NR_BlackApril_Stellary.webp', images: [] },
      { name: 'Movie teaser', client: 'Photon', type: 'video', videoUrl: 'https://notreal-projects.s3.eu-north-1.amazonaws.com/NR_BlackApril_Photon.mp4', preview: '/projects/NR_BlackApril_Photon.webp', images: [] },
    ]
  },
  {
    name: 'Ника Aiphonika',
    character: '/projects/NR_nika.webm',
    background: '/projects/Mayer.webp',
    bio: 'ИИ-креатор с 8-летним бэкграундом в контент-продюсировании и арт-дирекшене. Работала с L\'Oreal Paris, финтех-компанией Wallester, снимала клип для Biicla, создавала контент для Morgenshtern и международных брендов на Бали. Фокус — не генерация ради генерации, а выстроенные визуальные концепции, передающие эмоции и смыслы. Бакалавр искусств Манчестерского университета (Management in the Creative Arts), что обеспечивает системный подход к креативным решениям. Развивает собственное ИИ-коммьюнити с аудиторией более 400 человек.',
    projects: [
      { name: 'Бильярд', client: 'Smeshariki', type: 'video', videoUrl: 'https://notreal-projects.s3.eu-north-1.amazonaws.com/NR_NikaMayer_Smeshariki.mp4', preview: '/projects/NR_Mayer_Smeshariki.webp', images: [] },
      { name: 'Faces', client: 'Personal', type: 'video', videoUrl: 'https://notreal-projects.s3.eu-north-1.amazonaws.com/NR_NikaMayer_Faces.mp4', preview: '/projects/NR_Mayer_Faces.webp', images: [] },
      { name: 'Card', client: 'Wallester', type: 'video', videoUrl: 'https://notreal-projects.s3.eu-north-1.amazonaws.com/NR_NikaMayer_Card.mp4', preview: '/projects/NR_Mayer_Wallester.webp', images: [] },
      { name: 'Mask', client: 'Loreal', type: 'video', videoUrl: 'https://notreal-projects.s3.eu-north-1.amazonaws.com/NR_NikaMayer_Loreal.mp4', preview: '/projects/NR_Mayer_Loreal.webp', images: [] },
    ]
  },
  {
    name: 'Diginastasi',
    character: '/projects/NR_Diginasti.webm',
    background: '/projects/Digianast.webp',
    bio: 'Контент-креатор с 8-летним опытом в видеопроизводстве и 4-летним — в создании AI-контента. За плечами — более 100 AI-реклам и работа с крупнейшими брендами Казахстана: KazEnergy, BI Group, Halyk Bank, Freedom SuperApp и другими. Автор четырёх короткометражных фильмов, один из которых получил 4 номинации из 8 на местном кинофестивале. Победитель Higgsfield Best Video и участник мирового конкурса AI-короткометражек с призовым фондом $1 000 000. Суммарная аудитория в соцсетях — 24 000 подписчиков и свыше 16 000 000 просмотров.\nГлубокий бэкграунд в видеографии и фотографии, опыт работы с артистами и коммерческими клиентами, что обеспечивает профессиональный подход к AI-продакшену на всех этапах.',
    projects: [
      { name: 'Project 1', client: '', type: 'video', videoUrl: '', preview: '', images: [] },
      { name: 'Project 2', client: '', type: 'video', videoUrl: '', preview: '', images: [] },
      { name: 'Project 3', client: '', type: 'video', videoUrl: '', preview: '', images: [] },
      { name: 'Project 4', client: '', type: 'video', videoUrl: '', preview: '', images: [] },
    ]
  },
];

// Responsive layout: carousel on both mobile and desktop
const sphereRadius = isMobile ? 2.2 : 2.6;
const spacingX = isMobile ? 4.2 : 6.8;
const spacingY = isMobile ? 4.6 : 6.8;

// ============================================================
// MOBILE CAROUSEL STATE
// ============================================================
// Orbital carousel: spheres arranged in a circle, swipe to rotate
const carouselOrbitRadius = isMobile ? 7 : 10; // radius of the circular orbit
let carouselAngle = Math.random() * Math.PI * 2; // random initial angle
let carouselTargetAngle = carouselAngle;
let carouselCurrentIndex = 0; // which creator is centered
const carouselAnglePerItem = (Math.PI * 2) / creators.length;
// Compute initial center index from random angle
carouselCurrentIndex = Math.round(carouselAngle / carouselAnglePerItem) % creators.length;
if (carouselCurrentIndex < 0) carouselCurrentIndex += creators.length;
carouselTargetAngle = carouselCurrentIndex * carouselAnglePerItem;
carouselAngle = carouselTargetAngle;

const creatorPositions = creators.map(() => new THREE.Vector3(0, 0, 0));

function updateCarouselPositions() {
  creators.forEach((_, i) => {
    const angle = carouselAngle + i * carouselAnglePerItem;
    const x = Math.sin(angle) * carouselOrbitRadius;
    const z = Math.cos(angle) * carouselOrbitRadius - carouselOrbitRadius; // offset so center sphere is at z=0
    creatorPositions[i].set(x, 0, z);
    if (creatorGroups[i]) {
      creatorGroups[i].userData.baseY = 0;
    }
  });
}

// ============================================================
// TEXTURE LOADING with progress tracking
// ============================================================
const loadingManager = new THREE.LoadingManager();
let loadProgress = 0;
let loadingComplete = false;

function updateLoadingUI(progress) {
  const percent = Math.round(progress * 100);
  const percentEl = document.getElementById('loading-percent');
  const circleEl = document.getElementById('loading-circle');
  if (percentEl) percentEl.textContent = percent;
  if (circleEl) {
    const circumference = 2 * Math.PI * 54; // r=54
    circleEl.style.strokeDashoffset = circumference * (1 - progress);
  }
}

loadingManager.onProgress = (url, loaded, total) => {
  loadProgress = loaded / total;
  updateLoadingUI(loadProgress);
};

loadingManager.onLoad = () => {
  loadProgress = 1;
  updateLoadingUI(1);
  // Small delay after 100% for visual satisfaction
  setTimeout(() => {
    loadingComplete = true;
    const loading = document.getElementById('loading');
    if (loading) {
      loading.style.transition = 'opacity 0.6s ease';
      loading.style.opacity = '0';
      setTimeout(() => loading.remove(), 600);
    }
    // Show top nav bar
    const topNav = document.getElementById('top-nav');
    if (topNav) topNav.style.opacity = '1';
    // Show instructions
    const instr = document.getElementById('instructions');
    if (instr) instr.style.opacity = '0.8';
    // Reveal name label and avatar after loading
    setTimeout(() => {
      nameLabelEl.textContent = creators[carouselCurrentIndex].name;
      currentLabelIndex = carouselCurrentIndex;
      nameLabelEl.style.opacity = '0.85';
      labelVisible = true;
      showAvatar();
    }, 500);
  }, 400);
};

function isCarouselCenter(i) {
  const angle = carouselAngle + i * carouselAnglePerItem;
  return Math.abs(Math.sin(angle)) < 0.3;
}

const textureLoader = new THREE.TextureLoader(loadingManager);
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
function createProjectLabelTexture(projectName, labelAtTop = false, clientName = '') {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 1024, 1024);

  if (labelAtTop) {
    // Strong gradient backdrop — 45% of panel height
    const grad = ctx.createLinearGradient(0, 0, 0, 460);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
    grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.4)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 460);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (clientName) {
      // Client — white, lighter weight
      ctx.fillStyle = '#ffffff';
      ctx.font = '400 32px "SF Pro Display", "Helvetica Neue", Arial';
      // Sharp shadow layer
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 1;
      ctx.fillText(clientName, 512, 80);
      // Soft shadow layer (draw again)
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 3;
      ctx.fillText(clientName, 512, 80);
    }

    // Project name — white, bold, large
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 60px "SF Pro Display", "Helvetica Neue", Arial';
    const nameY = clientName ? 148 : 110;
    // Sharp shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 1;
    ctx.fillText(projectName, 512, nameY);
    // Soft glow shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 3;
    ctx.fillText(projectName, 512, nameY);
  } else {
    // Strong gradient backdrop — 45% of panel height from bottom
    const grad = ctx.createLinearGradient(0, 564, 0, 1024);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(0.4, 'rgba(0, 0, 0, 0.4)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 564, 1024, 460);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (clientName) {
      // Client — white, lighter weight
      ctx.fillStyle = '#ffffff';
      ctx.font = '400 32px "SF Pro Display", "Helvetica Neue", Arial';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 1;
      ctx.fillText(clientName, 512, 850);
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 3;
      ctx.fillText(clientName, 512, 850);
    }

    // Project name — white, bold, large
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 60px "SF Pro Display", "Helvetica Neue", Arial';
    const nameY = clientName ? 918 : 900;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 1;
    ctx.fillText(projectName, 512, nameY);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 3;
    ctx.fillText(projectName, 512, nameY);
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

  // Inner sphere — WHITE emissive glow core (visible when panels lift)
  const innerGeo = new THREE.SphereGeometry(sphereRadius - 0.02, 64, 64);
  const innerMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    side: THREE.FrontSide,
  });
  const innerSphere = new THREE.Mesh(innerGeo, innerMat);
  innerSphere.userData.isGlowCore = true;
  sphereGroup.add(innerSphere);
  innerSpheres.push(innerSphere);

  // 4 project panels
  creator.projects.forEach((proj, pi) => {
    const config = panelLayout[pi];
    const cardGroup = new THREE.Group();

    // Front panel — load per-project preview if available
    const projPreviewTexture = proj.preview
      ? (() => { const t = textureLoader.load(proj.preview); t.colorSpace = THREE.SRGBColorSpace; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t; })()
      : panelImage;
    const frontGeo = createSphericalPanelGeometry(sphereRadius, config.phiStart, config.phiLength, config.thetaStart, config.thetaLength);
    const frontMat = new THREE.MeshPhysicalMaterial({
      map: projPreviewTexture,
      side: THREE.FrontSide,
      roughness: 0.01,
      metalness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.005,
      envMapIntensity: 0.9,
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
      map: createProjectLabelTexture(proj.name, labelAtTop, proj.client),
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
      projectName: proj.name,
      project: proj,
      creatorName: creator.name,
      isHovered: false,
    };

    sphereGroup.add(cardGroup);
    allPanels.push(cardGroup);
  });

  // Glass refraction overlay sphere — minimal, no haze
  const glassGeo = new THREE.SphereGeometry(sphereRadius + 0.025, 64, 64);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transmission: 0.15,
    thickness: 0.05,
    ior: 1.1,
    roughness: 0.005,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.005,
    envMapIntensity: 0.2,
    reflectivity: 0.3,
    transparent: true,
    opacity: 0.15,
    side: THREE.FrontSide,
    depthWrite: false,
    attenuationDistance: 100.0,
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
// HTML NAME LABEL — single fixed element, centered on screen
// ============================================================
const nameLabelEl = document.createElement('div');
nameLabelEl.id = 'creator-name-label';
nameLabelEl.style.cssText = `
  position: fixed;
  left: 50%;
  bottom: ${isMobile ? '22%' : '25%'};
  transform: translateX(-50%);
  color: #ffffff;
  font-size: ${isMobile ? '16' : '13'}px;
  font-weight: ${isMobile ? '600' : '500'};
  letter-spacing: ${isMobile ? '2' : '2'}px;
  text-transform: uppercase;
  font-family: 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
  white-space: nowrap;
  text-align: center;
  opacity: 0;
  pointer-events: none;
  z-index: 10;
  transition: opacity 0.35s ease;
`;
document.body.appendChild(nameLabelEl);

// ============================================================
// CREATOR AVATAR (hero video left of sphere)
// ============================================================
const avatarEl = document.createElement('video');
avatarEl.id = 'creator-avatar';
avatarEl.autoplay = true;
avatarEl.loop = true;
avatarEl.muted = true;
avatarEl.playsInline = true;
avatarEl.style.cssText = `
  position: fixed;
  left: calc(100vw / 6);
  top: 50%;
  transform: translate(-50%, -50%);
  height: 82vh;
  max-height: 82vh;
  max-width: 82vw;
  object-fit: contain;
  pointer-events: none;
  z-index: 10;
  opacity: 0;
  transition: opacity 0.5s ease;
  user-select: none;
  -webkit-user-select: none;
`;
document.body.appendChild(avatarEl);

// ============================================================
// DETAIL VIEW BACKGROUND (fullscreen behind sphere)
// ============================================================
const detailBgEl = document.createElement('div');
detailBgEl.id = 'detail-background';
detailBgEl.style.cssText = `
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  pointer-events: none;
  z-index: 1;
  opacity: 0;
  transition: opacity 0.6s ease;
`;
// Dark gradient overlay for the detail background
const detailBgOverlay = document.createElement('div');
detailBgOverlay.id = 'detail-bg-overlay';
detailBgOverlay.style.cssText = `
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.55);
  pointer-events: none;
`;
detailBgEl.appendChild(detailBgOverlay);
document.body.appendChild(detailBgEl);

let avatarVisible = false;
let currentAvatarIndex = -1;
function showAvatar() {
  if (isMobile) return;
  const idx = carouselCurrentIndex;
  const creator = creators[idx];
  if (!creator || !creator.character) {
    hideAvatar(true);
    return;
  }
  if (currentAvatarIndex !== idx) {
    avatarEl.src = creator.character;
    currentAvatarIndex = idx;
  }
  if (!avatarVisible) {
    avatarEl.style.opacity = '1';
    avatarVisible = true;
  }
}
function hideAvatar(instant) {
  if (avatarVisible || instant) {
    avatarEl.style.opacity = '0';
    avatarVisible = false;
  }
}
function showDetailBackground() {
  const idx = selectedCreatorIndex >= 0 ? selectedCreatorIndex : carouselCurrentIndex;
  const creator = creators[idx];
  const bg = creator && creator.background ? creator.background : '';
  if (bg) {
    detailBgEl.style.backgroundImage = 'url(' + bg + ')';
  }
  detailBgEl.style.opacity = '1';
}
function hideDetailBackground() {
  detailBgEl.style.opacity = '0';
}

// ============================================================
// TOP NAVIGATION BAR
// ============================================================
const topNav = document.createElement('div');
topNav.id = 'top-nav';
topNav.style.cssText = `
  position: fixed; top: 0; left: 0; right: 0;
  display: flex; align-items: center; justify-content: space-between;
  padding: ${isMobile ? '16px 20px' : '20px 40px'};
  z-index: 150; opacity: 0;
  transition: opacity 0.6s ease;
  pointer-events: auto;
  font-family: 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
`;
topNav.innerHTML = isMobile ? `
  <a href="mailto:hello@notrealtalents.ai" style="font-size: 10px; color: #000000; text-decoration: none; letter-spacing: 0.5px; transition: color 0.2s;">hello@notrealtalents.ai</a>
  <img src="/NotReal_logo.svg" alt="NotReal" style="height: 14px; position: absolute; left: 50%; transform: translateX(-50%);" />
  <a href="#" id="download-presentation" style="font-size: 10px; color: #000000; text-decoration: none; letter-spacing: 0.5px; transition: color 0.2s;">скачать .pdf</a>
` : `
  <a href="mailto:hello@notrealtalents.ai" style="font-size: 13px; color: #000000; text-decoration: none; letter-spacing: 0.5px; transition: color 0.2s; cursor: none;">hello@notrealtalents.ai</a>
  <img src="/NotReal_logo.svg" alt="NotReal" style="height: 16px;" />
  <a href="#" id="download-presentation" style="font-size: 13px; color: #000000; text-decoration: none; letter-spacing: 0.5px; transition: color 0.2s; cursor: none;">скачать .pdf</a>
`;
document.body.appendChild(topNav);

// Nav color switching for detail view (dark bg)
function switchNavColors(toDark) {
  const links = topNav.querySelectorAll('a');
  const logo = topNav.querySelector('img');
  if (toDark) {
    links.forEach(l => l.style.color = '#ffffff');
    if (logo) logo.src = '/NotReal_logo_white.svg';
  } else {
    links.forEach(l => l.style.color = '#000000');
    if (logo) logo.src = '/NotReal_logo.svg';
  }
}

// Hover effects for nav links (desktop)
let navDarkMode = false;
if (!isMobile) {
  topNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('mouseenter', () => {
      link.style.color = isDetailView ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)';
      setCursorHover(true);
    });
    link.addEventListener('mouseleave', () => {
      link.style.color = isDetailView ? '#ffffff' : '#000000';
      setCursorHover(false);
    });
  });
}

// Keep a dummy nameLabels array for compatibility with loadingManager.onLoad
const nameLabels = creators.map(() => ({ style: { opacity: '0', filter: '' } }));

let currentLabelIndex = -1;
let labelVisible = false;

function updateNameLabels() {
  if (isDetailView) {
    nameLabelEl.style.opacity = '0';
    labelVisible = false;
    // Avatar stays visible in detail view
    return;
  }

  // Detect if carousel is moving
  const isMoving = Math.abs(carouselAngle - carouselTargetAngle) > 0.05;

  // Find current center creator
  let centerIdx = -1;
  for (let i = 0; i < creators.length; i++) {
    const angle = carouselAngle + i * carouselAnglePerItem;
    if (Math.abs(Math.sin(angle)) < 0.3) {
      centerIdx = i;
      break;
    }
  }

  if (isMoving) {
    // Fade out during motion
    nameLabelEl.style.opacity = '0';
    labelVisible = false;
    hideAvatar();
  } else if (centerIdx >= 0) {
    // Update text if changed
    if (currentLabelIndex !== centerIdx) {
      currentLabelIndex = centerIdx;
      nameLabelEl.textContent = creators[centerIdx].name;
    }
    // Fade in when settled
    if (!labelVisible) {
      nameLabelEl.style.opacity = '0.85';
      labelVisible = true;
    }
    showAvatar();
  }
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
    // Camera pan (desktop) / Carousel swipe (mobile)
    this.isPanning = false;
    this.panVelocity = new THREE.Vector2(0, 0);
    // Carousel swipe
    this.isCarouselSwiping = false;
    this.carouselSwipeVelocity = 0;
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
    } else if (!isDetailView) {
      // Swipe to rotate carousel (both mobile and desktop)
      this.isCarouselSwiping = true;
      this.carouselSwipeVelocity = 0;
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
    } else if (this.isCarouselSwiping) {
      this.wasPanning = true;
      const swipeSpeed = 0.008;
      carouselAngle += dx * swipeSpeed;
      carouselTargetAngle = carouselAngle;
      this.carouselSwipeVelocity = dx * swipeSpeed;
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
    // Snap carousel to nearest sphere (continuous, no rewind)
    if (this.isCarouselSwiping) {
      // Apply inertia then snap
      const inertiaAngle = carouselAngle + this.carouselSwipeVelocity * 8;
      const nearestIndex = Math.round(inertiaAngle / carouselAnglePerItem);
      carouselTargetAngle = nearestIndex * carouselAnglePerItem;
      carouselCurrentIndex = ((nearestIndex % creators.length) + creators.length) % creators.length;
    }
    // Tap detection for touch devices — emulate click if no drag
    if (isMobile && !this.hasDragged && this.startMouse.x !== 0) {
      this._handleTap(this.startMouse);
    }
    this.isRotatingSphere = false;
    this.activeSphere = null;
    this.isPanning = false;
    this.isCarouselSwiping = false;
  }

  _handleTap(coords) {
    const rect = this.domElement.getBoundingClientRect();
    const mx = ((coords.x - rect.left) / rect.width) * 2 - 1;
    const my = -((coords.y - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(new THREE.Vector2(mx, my), camera);

    if (isDetailView) {
      if (projectPopupOpen) return; // don't process taps while popup is open
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
    // Skip outline meshes
    if (intersect.object.userData && intersect.object.userData.isOutline) continue;
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
      // Show white inner sphere glow
      const ci = panel.userData.creatorIndex;
      gsap.to(innerSpheres[ci].material, { opacity: 0.6, duration: 0.3 });
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
  // Hide white inner sphere glow
  const ci = panel.userData.creatorIndex;
  gsap.to(innerSpheres[ci].material, { opacity: 0, duration: 0.3 });
  panel.userData.isHovered = false;
}

renderer.domElement.addEventListener('mousemove', onMouseMoveHover);

// ============================================================
// CAROUSEL ARROW BUTTONS (desktop only)
// ============================================================
function navigateCarousel(direction) {
  carouselCurrentIndex = ((carouselCurrentIndex + direction) % creators.length + creators.length) % creators.length;
  carouselTargetAngle += direction * carouselAnglePerItem;
}

if (!isMobile) {
  const arrowStyle = `
    position: fixed; top: 50%; z-index: 50;
    width: 48px; height: 48px; border: none; background: rgba(0,0,0,0.04);
    border-radius: 50%; cursor: none; display: flex; align-items: center;
    justify-content: center; transition: background 0.2s, transform 0.2s;
    backdrop-filter: blur(8px); pointer-events: auto;
  `;
  const arrowLeft = document.createElement('button');
  arrowLeft.id = 'carousel-arrow-left';
  arrowLeft.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
  arrowLeft.style.cssText = arrowStyle + 'left: 24px; transform: translateY(-50%);';
  arrowLeft.addEventListener('click', () => navigateCarousel(1));
  arrowLeft.addEventListener('mouseenter', () => { arrowLeft.style.background = 'rgba(0,0,0,0.1)'; arrowLeft.style.transform = 'translateY(-50%) scale(1.1)'; setCursorHover(true); });
  arrowLeft.addEventListener('mouseleave', () => { arrowLeft.style.background = 'rgba(0,0,0,0.04)'; arrowLeft.style.transform = 'translateY(-50%) scale(1)'; setCursorHover(false); });
  document.body.appendChild(arrowLeft);

  const arrowRight = document.createElement('button');
  arrowRight.id = 'carousel-arrow-right';
  arrowRight.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;
  arrowRight.style.cssText = arrowStyle + 'right: 24px; transform: translateY(-50%);';
  arrowRight.addEventListener('click', () => navigateCarousel(-1));
  arrowRight.addEventListener('mouseenter', () => { arrowRight.style.background = 'rgba(0,0,0,0.1)'; arrowRight.style.transform = 'translateY(-50%) scale(1.1)'; setCursorHover(true); });
  arrowRight.addEventListener('mouseleave', () => { arrowRight.style.background = 'rgba(0,0,0,0.04)'; arrowRight.style.transform = 'translateY(-50%) scale(1)'; setCursorHover(false); });
  document.body.appendChild(arrowRight);

  // Also support keyboard arrows
  document.addEventListener('keydown', (e) => {
    if (isDetailView) return;
    if (e.key === 'ArrowLeft') navigateCarousel(1);
    if (e.key === 'ArrowRight') navigateCarousel(-1);
  });
}

// ============================================================
// DETAIL VIEW
// ============================================================
// BOTTOM-LEFT: Creator name
const creatorInfoPanel = document.createElement('div');
creatorInfoPanel.id = 'creator-info-panel';
creatorInfoPanel.style.cssText = isMobile ? `
  position: fixed; left: 20px; bottom: 30px; right: 20px;
  padding: 0;
  z-index: 100; opacity: 0; pointer-events: none;
  transition: opacity 0.5s ease;
  font-family: 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
  display: flex; flex-direction: column; gap: 8px;
` : `
  position: fixed; left: 60px; bottom: 40px; right: 60px;
  padding: 0 40px;
  z-index: 100; opacity: 0; pointer-events: none;
  transition: opacity 0.5s ease;
  font-family: 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
`;
creatorInfoPanel.innerHTML = `
  <div id="detail-creator-name" style="font-size: ${isMobile ? '48' : '71'}px; font-weight: 700; color: #ffffff; line-height: 1.1;"></div>
`;
document.body.appendChild(creatorInfoPanel);

// RIGHT: Creator bio (vertically centered)
const creatorBioPanel = document.createElement('div');
creatorBioPanel.id = 'creator-bio-panel';
creatorBioPanel.style.cssText = isMobile ? `
  display: none;
` : `
  position: fixed; right: 120px; top: 50%; transform: translateY(-50%);
  width: 280px; padding: 0;
  z-index: 100; opacity: 0; pointer-events: none;
  transition: opacity 0.6s ease;
  font-family: 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
`;
creatorBioPanel.innerHTML = `
  <div id="detail-creator-bio" style="font-size: 14px; color: rgba(255,255,255,0.75); line-height: 1.7;"></div>
`;
document.body.appendChild(creatorBioPanel);

// CENTERED PROJECT POPUP (overlay modal)
const projectPopupOverlay = document.createElement('div');
projectPopupOverlay.id = 'project-popup-overlay';
projectPopupOverlay.style.cssText = `
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.80); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  z-index: 200; display: none; align-items: center; justify-content: center;
  cursor: default; transition: opacity 0.3s ease;
`;

const projectPopupCard = document.createElement('div');
projectPopupCard.id = 'project-popup-card';
projectPopupCard.style.cssText = `
  position: relative;
  width: ${isMobile ? '92vw' : '560px'}; max-width: 90vw; max-height: 85vh; overflow-y: auto;
  padding: ${isMobile ? '24px 20px' : '40px'};
  background: rgba(30,30,30,0.85); backdrop-filter: blur(40px); -webkit-backdrop-filter: blur(40px);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 20px;
  box-shadow: 0 24px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08);
  font-family: 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
`;
projectPopupOverlay.appendChild(projectPopupCard);
document.body.appendChild(projectPopupOverlay);

// Close popup on click outside card
projectPopupOverlay.addEventListener('click', (e) => {
  if (e.target === projectPopupOverlay) closeProjectPopup();
});

let projectPopupOpen = false;

function openProjectPopup(project, creatorName) {
  // Stop any currently playing video
  const existingVideo = projectPopupCard.querySelector('video');
  if (existingVideo) { existingVideo.pause(); existingVideo.removeAttribute('src'); existingVideo.load(); }

  let html = '';

  // Close button
  html += `<button id="popup-close" style="
    position: absolute; top: 14px; right: 14px; width: 36px; height: 36px;
    background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12);
    border-radius: 50%; color: rgba(255,255,255,0.7); font-size: 16px;
    display: flex; align-items: center; justify-content: center;
    cursor: ${isMobile ? 'pointer' : 'none'}; transition: background 0.2s, color 0.2s; z-index: 10;
    font-family: system-ui; line-height: 1; padding: 0;
  ">&#10005;</button>`;

  // Client label
  if (project.client) {
    html += `<div style="font-size: 11px; text-transform: uppercase; letter-spacing: 3px; color: rgba(255,255,255,0.45); margin-bottom: 6px; font-weight: 500; padding-right: 40px;">${project.client}</div>`;
  }

  // Project name
  html += `<div style="font-size: ${isMobile ? '22' : '28'}px; font-weight: 600; color: #ffffff; margin-bottom: ${isMobile ? '16' : '24'}px; padding-right: 40px;">${project.name}</div>`;

  // Video player (16:9)
  if (project.type === 'video' && project.videoUrl) {
    html += `
      <div style="position: relative; width: 100%; padding-bottom: 56.25%; background: #000; border-radius: 12px; overflow: hidden;">
        <video
          src="${project.videoUrl}"
          controls
          playsinline
          preload="metadata"
          style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: contain; cursor: default; border-radius: 12px;"
        ></video>
      </div>
    `;
  }

  // Image gallery grid
  if (project.type === 'images' && project.images && project.images.length > 0) {
    html += `<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">`;
    project.images.forEach((imgUrl, idx) => {
      html += `
        <div data-popup-lightbox-idx="${idx}" style="position: relative; padding-bottom: 100%; border-radius: 8px; overflow: hidden; cursor: pointer; background: rgba(255,255,255,0.05);">
          <img src="${imgUrl}" loading="lazy" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease;" />
        </div>
      `;
    });
    html += `</div>`;
  }

  projectPopupCard.innerHTML = html;
  projectPopupOverlay.style.display = 'flex';
  projectPopupOpen = true;

  // Attach close button
  const closeBtn = document.getElementById('popup-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeProjectPopup);
    if (!isMobile) {
      closeBtn.addEventListener('mouseenter', () => { closeBtn.style.background = 'rgba(255,255,255,0.18)'; closeBtn.style.color = '#ffffff'; setCursorHover(true); });
      closeBtn.addEventListener('mouseleave', () => { closeBtn.style.background = 'rgba(255,255,255,0.08)'; closeBtn.style.color = 'rgba(255,255,255,0.7)'; setCursorHover(false); });
    }
  }

  // Attach image lightbox
  if (project.type === 'images' && project.images && project.images.length > 0) {
    projectPopupCard.querySelectorAll('[data-popup-lightbox-idx]').forEach(el => {
      el.addEventListener('click', () => {
        openLightbox(project.images, parseInt(el.dataset.popupLightboxIdx));
      });
      if (!isMobile) {
        el.addEventListener('mouseenter', () => { const img = el.querySelector('img'); if (img) img.style.transform = 'scale(1.05)'; setCursorHover(true); });
        el.addEventListener('mouseleave', () => { const img = el.querySelector('img'); if (img) img.style.transform = 'scale(1)'; setCursorHover(false); });
      }
    });
  }
}

function closeProjectPopup() {
  const video = projectPopupCard.querySelector('video');
  if (video) { video.pause(); video.removeAttribute('src'); video.load(); }
  projectPopupOverlay.style.display = 'none';
  projectPopupOpen = false;
}

// RIGHT / BOTTOM: Project info panel (mobile swipe sheet, hidden on desktop)
const projectInfoPanel = document.createElement('div');
projectInfoPanel.id = 'project-info-panel';
projectInfoPanel.style.cssText = isMobile ? `
  position: fixed; left: 0; right: 0; bottom: 0;
  overflow: hidden;
  padding: 0;
  background: rgba(255,255,255,0.08); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255,255,255,0.12); border-bottom: none;
  border-radius: 20px 20px 0 0; z-index: 100; opacity: 0; pointer-events: none;
  transition: opacity 0.5s ease;
  font-family: 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
  box-shadow: 0 -4px 40px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.1);
  will-change: transform;
` : `display: none;`;
document.body.appendChild(projectInfoPanel);

// ============================================================
// MOBILE SWIPE SHEET LOGIC (legacy — kept minimal for mobile popup)
// ============================================================
let sheetExpanded = true;
let sheetCollapsedHeight = 72;
let sheetExpandedHeight = 0;
let sheetDragging = false;
let sheetDragStartY = 0;
let sheetDragCurrentY = 0;
let sheetTranslateY = 0;

function getSheetExpandedHeight() {
  if (!isMobile) return 0;
  projectInfoPanel.style.transform = 'translateY(0)';
  const natural = projectInfoPanel.scrollHeight;
  return Math.min(natural, window.innerHeight * 0.7);
}

function setSheetPosition(translateY, animate) {
  if (!isMobile) return;
  const maxTranslate = sheetExpandedHeight - sheetCollapsedHeight;
  translateY = Math.max(0, Math.min(translateY, maxTranslate));
  sheetTranslateY = translateY;
  if (animate) {
    projectInfoPanel.style.transition = 'opacity 0.5s ease, transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)';
  } else {
    projectInfoPanel.style.transition = 'opacity 0.5s ease';
  }
  projectInfoPanel.style.transform = `translateY(${translateY}px)`;

  const content = document.getElementById('sheet-content');
  const collapsed = document.getElementById('sheet-collapsed');
  if (content && collapsed) {
    if (translateY > (sheetExpandedHeight - sheetCollapsedHeight) * 0.5) {
      content.style.opacity = '0';
      content.style.pointerEvents = 'none';
      collapsed.style.opacity = '1';
      sheetExpanded = false;
    } else {
      content.style.opacity = '1';
      content.style.pointerEvents = 'auto';
      collapsed.style.opacity = '0';
      sheetExpanded = true;
    }
  }
}

function expandSheet() {
  setSheetPosition(0, true);
  sheetExpanded = true;
}

function collapseSheet() {
  const maxTranslate = sheetExpandedHeight - sheetCollapsedHeight;
  setSheetPosition(maxTranslate, true);
  sheetExpanded = false;
}

if (isMobile) {
  projectInfoPanel.addEventListener('touchstart', (e) => {
    const rect = projectInfoPanel.getBoundingClientRect();
    const touchY = e.touches[0].clientY;
    const relY = touchY - rect.top;
    if (sheetExpanded && relY > 56) return;
    sheetDragging = true;
    sheetDragStartY = touchY;
    sheetDragCurrentY = touchY;
    projectInfoPanel.style.transition = 'opacity 0.5s ease';
  }, { passive: true });

  projectInfoPanel.addEventListener('touchmove', (e) => {
    if (!sheetDragging) return;
    sheetDragCurrentY = e.touches[0].clientY;
    const delta = sheetDragCurrentY - sheetDragStartY;
    let newTranslate;
    if (sheetExpanded) {
      newTranslate = Math.max(0, delta);
    } else {
      const maxT = sheetExpandedHeight - sheetCollapsedHeight;
      newTranslate = maxT + delta;
    }
    const maxTranslate = sheetExpandedHeight - sheetCollapsedHeight;
    newTranslate = Math.max(0, Math.min(newTranslate, maxTranslate));
    projectInfoPanel.style.transform = `translateY(${newTranslate}px)`;

    const progress = newTranslate / maxTranslate;
    const content = document.getElementById('sheet-content');
    const collapsed = document.getElementById('sheet-collapsed');
    if (content) content.style.opacity = String(1 - progress);
    if (collapsed) collapsed.style.opacity = String(progress);
  }, { passive: true });

  const sheetTouchEnd = () => {
    if (!sheetDragging) return;
    sheetDragging = false;
    const delta = sheetDragCurrentY - sheetDragStartY;
    const threshold = 60;
    if (sheetExpanded) {
      if (delta > threshold) collapseSheet(); else expandSheet();
    } else {
      if (delta < -threshold) expandSheet(); else collapseSheet();
    }
  };
  projectInfoPanel.addEventListener('touchend', sheetTouchEnd);
  projectInfoPanel.addEventListener('touchcancel', sheetTouchEnd);

  projectInfoPanel.addEventListener('click', (e) => {
    if (!sheetExpanded && !sheetDragging) expandSheet();
  });
}

// ============================================================
// LIGHTBOX OVERLAY (for image projects)
// ============================================================
const lightboxOverlay = document.createElement('div');
lightboxOverlay.id = 'lightbox-overlay';
lightboxOverlay.style.cssText = `
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.92); backdrop-filter: blur(10px);
  z-index: 300; display: none; align-items: center; justify-content: center;
  flex-direction: column; cursor: default;
`;
lightboxOverlay.innerHTML = `
  <button id="lightbox-close" style="position: absolute; top: 20px; right: 24px; background: none; border: none; color: white; font-size: 32px; cursor: pointer; z-index: 310; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; opacity: 0.7; transition: opacity 0.2s; font-family: system-ui;">✕</button>
  <button id="lightbox-prev" style="position: absolute; left: 20px; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.1); border: none; color: white; font-size: 28px; cursor: pointer; z-index: 310; width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px); transition: background 0.2s;">‹</button>
  <img id="lightbox-image" style="max-width: 90vw; max-height: 85vh; object-fit: contain; border-radius: 8px; box-shadow: 0 8px 40px rgba(0,0,0,0.3); user-select: none;" />
  <button id="lightbox-next" style="position: absolute; right: 20px; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.1); border: none; color: white; font-size: 28px; cursor: pointer; z-index: 310; width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px); transition: background 0.2s;">›</button>
  <div id="lightbox-counter" style="position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%); color: rgba(255,255,255,0.5); font-size: 13px; letter-spacing: 2px; font-family: 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif; font-weight: 300;"></div>
`;
document.body.appendChild(lightboxOverlay);

let lightboxImages = [];
let lightboxIndex = 0;

function openLightbox(images, index) {
  lightboxImages = images;
  lightboxIndex = index;
  updateLightboxImage();
  lightboxOverlay.style.display = 'flex';
}

function closeLightbox() {
  lightboxOverlay.style.display = 'none';
  lightboxImages = [];
}

function updateLightboxImage() {
  document.getElementById('lightbox-image').src = lightboxImages[lightboxIndex];
  document.getElementById('lightbox-counter').textContent = `${lightboxIndex + 1} / ${lightboxImages.length}`;
  document.getElementById('lightbox-prev').style.display = lightboxIndex > 0 ? 'flex' : 'none';
  document.getElementById('lightbox-next').style.display = lightboxIndex < lightboxImages.length - 1 ? 'flex' : 'none';
}

document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
document.getElementById('lightbox-close').addEventListener('mouseenter', function() { this.style.opacity = '1'; });
document.getElementById('lightbox-close').addEventListener('mouseleave', function() { this.style.opacity = '0.7'; });
document.getElementById('lightbox-prev').addEventListener('click', () => { if (lightboxIndex > 0) { lightboxIndex--; updateLightboxImage(); } });
document.getElementById('lightbox-prev').addEventListener('mouseenter', function() { this.style.background = 'rgba(255,255,255,0.2)'; });
document.getElementById('lightbox-prev').addEventListener('mouseleave', function() { this.style.background = 'rgba(255,255,255,0.1)'; });
document.getElementById('lightbox-next').addEventListener('click', () => { if (lightboxIndex < lightboxImages.length - 1) { lightboxIndex++; updateLightboxImage(); } });
document.getElementById('lightbox-next').addEventListener('mouseenter', function() { this.style.background = 'rgba(255,255,255,0.2)'; });
document.getElementById('lightbox-next').addEventListener('mouseleave', function() { this.style.background = 'rgba(255,255,255,0.1)'; });
lightboxOverlay.addEventListener('click', (e) => { if (e.target === lightboxOverlay) closeLightbox(); });

// ============================================================
// POPULATE PROJECT PANEL (mobile swipe sheet)
// ============================================================
function populateProjectPanel(project, creatorName) {
  const existingVideo = projectInfoPanel.querySelector('video');
  if (existingVideo) { existingVideo.pause(); existingVideo.removeAttribute('src'); existingVideo.load(); }

  let html = '';

  // --- DRAG HANDLE ---
  html += `<div id="sheet-handle" style="padding: 12px 0 8px; cursor: grab; touch-action: none;">`;
  html += `<div style="width: 40px; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.25); margin: 0 auto;"></div>`;
  html += `</div>`;

  // --- COLLAPSED MINI-BAR ---
  html += `<div id="sheet-collapsed" style="position: absolute; left: 0; right: 0; top: 0; padding: 20px 24px 16px; pointer-events: none; opacity: 0; transition: opacity 0.2s ease;">`;
  html += `<div style="display: flex; align-items: center; justify-content: space-between;">`;
  html += `<div>`;
  if (project.client) html += `<div style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.5); margin-bottom: 2px;">${project.client}</div>`;
  html += `<div style="font-size: 18px; font-weight: 600; color: #ffffff;">${project.name}</div>`;
  html += `</div>`;
  html += `<div style="font-size: 11px; color: rgba(255,255,255,0.4); letter-spacing: 1px;">↑ swipe up</div>`;
  html += `</div>`;
  html += `</div>`;

  // --- EXPANDABLE CONTENT ---
  html += `<div id="sheet-content" style="padding: 0 20px 24px; overflow-y: auto; max-height: calc(70vh - 48px); transition: opacity 0.2s ease;">`;

  // Creator info at top of sheet
  if (creatorName) {
    html += `<div style="margin-bottom: 16px; padding-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,0.1);">`;
    html += `<div style="font-size: 20px; font-weight: 600; color: #ffffff; margin-bottom: 4px;">${creatorName}</div>`;
    const mobileBio = creators[selectedCreatorIndex] ? creators[selectedCreatorIndex].bio : '';
    html += `<div style="font-size: 12px; color: rgba(255,255,255,0.5); line-height: 1.5;">${mobileBio ? fixTypography(mobileBio).replace(/\\n/g, '<br>').replace(/\n/g, '<br>') : ''}</div>`;
    html += `</div>`;
  }

  // Client label
  if (project.client) {
    html += `<div style="font-size: 11px; text-transform: uppercase; letter-spacing: 3px; color: rgba(255,255,255,0.5); margin-bottom: 6px; font-weight: 500;">${project.client}</div>`;
  }

  // Project name
  html += `<div style="font-size: 22px; font-weight: 600; color: #ffffff; margin-bottom: 16px;">${project.name}</div>`;

  // Video player (16:9)
  if (project.type === 'video' && project.videoUrl) {
    html += `
      <div style="position: relative; width: 100%; padding-bottom: 56.25%; background: #000; border-radius: 12px; overflow: hidden; margin-bottom: 16px;">
        <video
          src="${project.videoUrl}"
          controls
          playsinline
          preload="metadata"
          style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: contain; cursor: default; border-radius: 12px;"
        ></video>
      </div>
    `;
  }

  // Image gallery grid
  if (project.type === 'images' && project.images && project.images.length > 0) {
    html += `<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 16px;">`;
    project.images.forEach((imgUrl, idx) => {
      html += `
        <div data-lightbox-idx="${idx}" style="position: relative; padding-bottom: 100%; border-radius: 8px; overflow: hidden; cursor: pointer; background: rgba(255,255,255,0.05);">
          <img src="${imgUrl}" loading="lazy" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease;" />
        </div>
      `;
    });
    html += `</div>`;
  }

  // Close button
  html += `
    <button id="detail-close" style="
      background: rgba(255,255,255,0.12); color: #ffffff; border: 1px solid rgba(255,255,255,0.15); padding: 12px 20px; border-radius: 10px;
      font-size: 13px; cursor: pointer; font-family: inherit; letter-spacing: 1px;
      transition: background 0.2s, border-color 0.2s; width: 100%; font-weight: 500;
      backdrop-filter: blur(8px);
    ">Close</button>
  `;

  html += `</div>`; // close #sheet-content

  projectInfoPanel.innerHTML = html;

  // Measure and set up sheet heights
  requestAnimationFrame(() => {
    sheetExpandedHeight = Math.min(projectInfoPanel.scrollHeight, window.innerHeight * 0.7);
    projectInfoPanel.style.height = sheetExpandedHeight + 'px';
    sheetExpanded = true;
    sheetTranslateY = 0;
    projectInfoPanel.style.transform = 'translateY(0)';
  });

  // Re-attach close button
  const closeBtn = document.getElementById('detail-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', returnToOverview);
  }

  // Attach image lightbox
  if (project.type === 'images' && project.images && project.images.length > 0) {
    projectInfoPanel.querySelectorAll('[data-lightbox-idx]').forEach(el => {
      el.addEventListener('click', () => {
        openLightbox(project.images, parseInt(el.dataset.lightboxIdx));
      });
    });
  }
}

function openDetailView(panel) {
  if (isDetailView) return;
  isDetailView = true;
  selectedPanel = panel;
  selectedCreatorIndex = panel.userData.creatorIndex;

  if (isMobile) {
    populateProjectPanel(panel.userData.project, panel.userData.creatorName);
  } else {
    const nameEl = document.getElementById('detail-creator-name');
    nameEl.textContent = panel.userData.creatorName;
    const creatorBio = creators[panel.userData.creatorIndex].bio;
    const bioEl = document.getElementById('detail-creator-bio');
    if (bioEl) {
      bioEl.innerHTML = creatorBio ? fixTypography(creatorBio).replace(/\\n/g, '<br>').replace(/\n/g, '<br>') : '';
    }
  }

  const creatorGroup = creatorGroups[selectedCreatorIndex];
  const targetPos = creatorGroup.position.clone();

  // Highlight selected panel with white glow
  highlightPanel(panel);

  // Center camera on sphere (no horizontal offset)
  gsap.to(camera.position, {
    x: targetPos.x,
    y: isMobile ? targetPos.y + 1.5 : targetPos.y,
    z: isMobile ? 9 : 12,
    duration: 1.0,
    ease: 'power3.inOut'
  });

  // Hide non-selected spheres — fade all materials uniformly + scale down
  creatorGroups.forEach((g, i) => {
    if (i !== selectedCreatorIndex) {
      // Immediately hide the inner white glow sphere so it never shows through
      innerSpheres[i].material.opacity = 0;
      innerSpheres[i].visible = false;

      // Scale down and move back
      gsap.to(g.scale, { x: 0.6, y: 0.6, z: 0.6, duration: 0.7, ease: 'power2.in' });
      gsap.to(g.position, { z: -5, duration: 0.7, ease: 'power2.in', onComplete: () => {
        g.visible = false;
      }});
      // Fade panels and glass only (skip inner glow — already hidden)
      const fadePanels = (obj) => {
        if (obj.userData && obj.userData.isGlowCore) return; // skip inner sphere
        if (obj.material) {
          obj.material.transparent = true;
          gsap.to(obj.material, { opacity: 0, duration: 0.6, ease: 'power2.in' });
        }
        if (obj.children) obj.children.forEach(fadePanels);
      };
      fadePanels(sphereMeshGroups[i]);
    }
  });

  // Hide the single name label (avatar stays visible)
  nameLabelEl.style.opacity = '0';
  labelVisible = false;

  // Show fullscreen background (desktop only)
  if (!isMobile) showDetailBackground();

  setTimeout(() => {
    if (isMobile) {
      projectInfoPanel.style.opacity = '1';
      projectInfoPanel.style.pointerEvents = 'auto';
    } else {
      creatorInfoPanel.style.opacity = '1';
      creatorInfoPanel.style.pointerEvents = 'auto';
      creatorBioPanel.style.opacity = '1';
      creatorBioPanel.style.pointerEvents = 'auto';
    }
  }, 500);

  const instr = document.getElementById('instructions');
  if (instr) instr.style.opacity = '0';

  // Hide carousel arrows in detail view
  const arrowL = document.getElementById('carousel-arrow-left');
  const arrowR = document.getElementById('carousel-arrow-right');
  if (arrowL) { arrowL.style.opacity = '0'; arrowL.style.pointerEvents = 'none'; }
  if (arrowR) { arrowR.style.opacity = '0'; arrowR.style.pointerEvents = 'none'; }

  // Switch nav to white for dark background (desktop only)
  if (!isMobile) switchNavColors(true);
}

// Emissive border meshes for selected panel highlight
const panelBorders = new Map(); // panel -> border mesh

function highlightPanel(panel) {
  gsap.to(panel.scale, { x: 1.08, y: 1.08, z: 1.08, duration: 0.3, ease: 'power2.out' });
  // Show white inner sphere glow
  const ci = panel.userData.creatorIndex;
  gsap.to(innerSpheres[ci].material, { opacity: 0.85, duration: 0.3 });
}

function unhighlightPanel(panel) {
  gsap.to(panel.scale, { x: 1, y: 1, z: 1, duration: 0.3, ease: 'power2.out' });
  // Hide white inner sphere glow
  const ci = panel.userData.creatorIndex;
  gsap.to(innerSpheres[ci].material, { opacity: 0, duration: 0.3 });
}

function updateDetailProject(panel) {
  if (selectedPanel && selectedPanel !== panel) {
    unhighlightPanel(selectedPanel);
  }
  selectedPanel = panel;
  highlightPanel(panel);
  if (isMobile) {
    populateProjectPanel(panel.userData.project, panel.userData.creatorName);
  } else {
    openProjectPopup(panel.userData.project, panel.userData.creatorName);
  }
}

function returnToOverview() {
  if (!isDetailView) return;
  isDetailView = false;

  // Close popup if open (desktop)
  if (projectPopupOpen) closeProjectPopup();

  // Reset selected panel highlight
  if (selectedPanel) {
    unhighlightPanel(selectedPanel);
  }

  if (isMobile) {
    projectInfoPanel.style.opacity = '0';
    projectInfoPanel.style.pointerEvents = 'none';
    projectInfoPanel.style.transform = 'translateY(0)';
    projectInfoPanel.style.height = '';
    sheetExpanded = true;
    sheetTranslateY = 0;
    const activeVideo = projectInfoPanel.querySelector('video');
    if (activeVideo) { activeVideo.pause(); activeVideo.removeAttribute('src'); activeVideo.load(); }
  } else {
    creatorInfoPanel.style.opacity = '0';
    creatorInfoPanel.style.pointerEvents = 'none';
    creatorBioPanel.style.opacity = '0';
    creatorBioPanel.style.pointerEvents = 'none';
  }

  gsap.to(camera.position, {
    x: baseCameraPos.x + cameraPanOffset.x,
    y: baseCameraPos.y + cameraPanOffset.y,
    z: baseCameraPos.z,
    duration: 1.0,
    ease: 'power3.inOut'
  });

  creatorGroups.forEach((g, i) => {
    g.visible = true;
    // Restore inner sphere visibility (hidden during fade-out)
    innerSpheres[i].visible = true;
    innerSpheres[i].material.opacity = 0; // but keep it transparent (glow only on hover)
    gsap.to(g.scale, { x: 1, y: 1, z: 1, duration: 0.8, ease: 'power2.out' });
    gsap.to(g.position, { z: 0, duration: 0.8, ease: 'power2.out' });
    // Restore all materials uniformly
    const restoreAll = (obj) => {
      if (obj.material) {
        // Inner glow core should be hidden by default
        if (obj.userData && obj.userData.isGlowCore) {
          gsap.to(obj.material, { opacity: 0, duration: 0.3 });
        } else {
          obj.material.transparent = true;
          gsap.to(obj.material, { opacity: 1, duration: 0.7, ease: 'power2.out' });
        }
      }
      // Reset panel scales
      if (allPanels.includes(obj)) {
        gsap.to(obj.scale, { x: 1, y: 1, z: 1, duration: 0.3 });
      }
      if (obj.children) obj.children.forEach(restoreAll);
    };
    restoreAll(sphereMeshGroups[i]);
  });

  const instr = document.getElementById('instructions');
  if (instr) instr.style.opacity = '0.8';

  // Show carousel arrows again
  const arrowL = document.getElementById('carousel-arrow-left');
  const arrowR = document.getElementById('carousel-arrow-right');
  if (arrowL) { arrowL.style.opacity = '1'; arrowL.style.pointerEvents = 'auto'; }
  if (arrowR) { arrowR.style.opacity = '1'; arrowR.style.pointerEvents = 'auto'; }

  // Switch nav back to dark for light background (desktop only)
  if (!isMobile) switchNavColors(false);

  // Hide fullscreen background (desktop only)
  if (!isMobile) hideDetailBackground();

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
    // In detail view: click panel on selected sphere to open project popup, click elsewhere to close
    if (projectPopupOpen) return; // don't process canvas clicks while popup is open
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
  if (e.key === 'Escape') {
    if (typeof lightboxOverlay !== 'undefined' && lightboxOverlay.style.display === 'flex') { closeLightbox(); return; }
    if (projectPopupOpen) { closeProjectPopup(); return; }
    if (isDetailView) returnToOverview();
  }
  // Lightbox arrow navigation
  if (typeof lightboxOverlay !== 'undefined' && lightboxOverlay.style.display === 'flex') {
    if (e.key === 'ArrowLeft' && lightboxIndex > 0) { lightboxIndex--; updateLightboxImage(); }
    if (e.key === 'ArrowRight' && lightboxIndex < lightboxImages.length - 1) { lightboxIndex++; updateLightboxImage(); }
  }
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
// LOADING — handled by loadingManager.onLoad
// ============================================================

// ============================================================
// POST-PROCESSING: Film Grain/CA + Bloom
// ============================================================
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

// Bloom
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.15,  // strength — subtle
  0.5,   // radius
  0.85   // threshold
);
composer.addPass(bloomPass);

const filmGrainCA = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    grainIntensity: { value: 0.008 },
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
// MORPHING BLACK BLOB BACKGROUND
// ============================================================
// Two stacked DOM canvases: blob (with CSS blur) + noise (crisp on top)
const blobCanvas = document.createElement('canvas');
blobCanvas.id = 'blob-bg';
blobCanvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:-2;pointer-events:none;filter:blur(60px);-webkit-filter:blur(60px);';
document.body.insertBefore(blobCanvas, document.body.firstChild);
const blobCtx = blobCanvas.getContext('2d');

// Noise canvas — sits on top of blob, no blur
const noiseDomCanvas = document.createElement('canvas');
noiseDomCanvas.id = 'noise-bg';
noiseDomCanvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;';
document.body.insertBefore(noiseDomCanvas, blobCanvas.nextSibling);
const noiseDomCtx = noiseDomCanvas.getContext('2d');

function resizeBlobCanvas() {
  blobCanvas.width = window.innerWidth;
  blobCanvas.height = window.innerHeight;
  noiseDomCanvas.width = window.innerWidth;
  noiseDomCanvas.height = window.innerHeight;
}
resizeBlobCanvas();
window.addEventListener('resize', resizeBlobCanvas);

// Simple 2D noise function (value noise)
function hash(x, y) {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) & 0x7fffffff) / 0x7fffffff;
}
function smoothNoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const n00 = hash(ix, iy), n10 = hash(ix + 1, iy);
  const n01 = hash(ix, iy + 1), n11 = hash(ix + 1, iy + 1);
  return n00 * (1-sx)*(1-sy) + n10 * sx*(1-sy) + n01 * (1-sx)*sy + n11 * sx * sy;
}
function fbm(x, y, octaves) {
  let val = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < octaves; i++) {
    val += amp * smoothNoise(x * freq, y * freq);
    amp *= 0.5;
    freq *= 2;
  }
  return val;
}

// Noise overlay canvas (pre-generated, refreshed periodically)
const noiseCanvas = document.createElement('canvas');
const noiseCtx = noiseCanvas.getContext('2d');
let noiseImageData = null;
let noiseFrame = 0;

function generateNoiseTexture(w, h) {
  noiseCanvas.width = w;
  noiseCanvas.height = h;
  noiseImageData = noiseCtx.createImageData(w, h);
}

function updateNoise() {
  if (!noiseImageData) return;
  const d = noiseImageData.data;
  const len = d.length;
  for (let i = 0; i < len; i += 4) {
    const v = (Math.random() * 30) | 0; // subtle noise
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
    d[i + 3] = 45; // stronger noise visibility
  }
  noiseCtx.putImageData(noiseImageData, 0, 0);
}

function drawMorphBlob(t) {
  const w = blobCanvas.width, h = blobCanvas.height;

  // Ensure noise canvas matches size
  if (noiseCanvas.width !== w || noiseCanvas.height !== h) {
    generateNoiseTexture(w, h);
  }

  // --- Draw blob shape directly on blobCanvas (CSS blur handles feathering) ---
  blobCtx.clearRect(0, 0, w, h);

  // Center moves slowly
  const cx = w * 0.5 + Math.sin(t * 0.15) * w * 0.06;
  const cy = h * 0.5 + Math.cos(t * 0.12) * h * 0.05;

  // Base radius covers ~70-80% of screen
  const baseR = Math.min(w, h) * 0.42;
  const points = 120;

  blobCtx.beginPath();
  for (let i = 0; i <= points; i++) {
    const a = (i / points) * Math.PI * 2;
    // Multiple noise layers for organic morphing
    const n1 = fbm(Math.cos(a) * 1.5 + t * 0.08, Math.sin(a) * 1.5 + t * 0.06, 4);
    const n2 = fbm(Math.cos(a) * 0.8 - t * 0.05 + 10, Math.sin(a) * 0.8 + t * 0.07 + 10, 3);
    const r = baseR * (0.85 + n1 * 0.35 + n2 * 0.15);
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) blobCtx.moveTo(px, py);
    else blobCtx.lineTo(px, py);
  }
  blobCtx.closePath();
  blobCtx.fillStyle = '#000000';
  blobCtx.fill();

  // --- Noise overlay on separate DOM canvas (not blurred) ---
  noiseFrame++;
  if (noiseFrame % 3 === 0) updateNoise();
  noiseDomCtx.clearRect(0, 0, w, h);
  noiseDomCtx.drawImage(noiseCanvas, 0, 0, noiseCanvas.width, noiseCanvas.height, 0, 0, w, h);
}

// ============================================================
// ANIMATION LOOP
// ============================================================
let time = 0;

function animate() {
  requestAnimationFrame(animate);
  time += 0.016;

  controller.update();
  updateCursor();

  // Draw morphing blob background
  drawMorphBlob(time);

  // Floating / breathing animation — each sphere with unique phase
  if (!isDetailView) {
    // Smooth carousel angle interpolation
    carouselAngle += (carouselTargetAngle - carouselAngle) * 0.08;
    updateCarouselPositions();
  }

  creatorGroups.forEach((group, i) => {
    const phase = i * 1.3;
    const floatY = Math.sin(time * 0.7 + phase) * 0.18;

    if (!isDetailView) {
      // Carousel: position on orbital ring
      group.position.x = creatorPositions[i].x;
      group.position.y = creatorPositions[i].y + floatY;
      group.position.z = creatorPositions[i].z;

      // Scale based on depth (front = big, sides = smaller, back = tiny)
      const angle = carouselAngle + i * carouselAnglePerItem;
      const cosAngle = Math.cos(angle);
      // cosAngle: 1 = front, 0 = side, -1 = back
      // Central sphere is prominently larger
      const maxScale = isMobile ? 1.5 : 1.3;
      const scaleFactor = THREE.MathUtils.clamp(0.3 + cosAngle * 1.2, 0.15, maxScale);
      const breathe = 1.0 + Math.sin(time * 0.9 + phase * 2.1) * 0.012;
      group.scale.setScalar(scaleFactor * breathe);

      // Hide spheres that are behind
      group.visible = cosAngle > -0.3;
    } else {
      const floatX = Math.cos(time * 0.5 + phase * 1.7) * 0.06;
      group.position.y = group.userData.baseY + floatY;
      group.position.x = creatorPositions[i].x + floatX;

      // Subtle scale breathing
      const breathe = 1.0 + Math.sin(time * 0.9 + phase * 2.1) * 0.012;
      group.scale.setScalar(breathe);
    }

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
