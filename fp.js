console.clear();

let webgl_context = null;
let program = null;
let canvas = null;
let attr_vertex = null;
let attr_normal = null;
let attr_texCoord = null;
let uniform_color = null;
let uniform_solid_color = null;
let uniform_view = null;
let uniform_props = null;
let uniform_perspective = null;
let uniform_light = null;
let uniform_trans = null;
let uniform_eye = null;
let uniform_textureSampler = null;
let uniform_shading_enabled = null;
let uniform_alpha = null;

let vertex_data = [];
let normal_data = [];
let texCoord_data = [];
let size = 3;
let textures = [];

// Camera
let xt = 0.0, yt = 0.2, zt = 0.6;
let fov = 60;

// Camera lerp
let lerp_start = null;
let lerp_from = null;
let lerp_to = null;
let lerp_duration = 2000;
let cam_lerping = false;
let cam_lerp_done_cb = null;
let tracking_active = false;

const lxt = 0.0, lyt = 0.0, lzt = 0.0;
const up = vec3(0.0, 1.0, 0.0);

// View mode: "solar" | "system" | "orrery"
let view_mode = "system";

// Selected planet index (Earth default)
let selected_planet = 2;

// Grand tour
let grand_tour_active = false;
let grand_tour_index = 0;
let grand_tour_timer = null;
let _tour_prev_time_mode = 'simulated';
let _tour_prev_real_positions = false;

// Time mode
let time_mode = "simulated";
let sim_date = new Date();
let last_frame_time = performance.now();
let use_real_positions = false;
let orbit_speed_crd = 1.0;

const SCRUBBER_START_YEAR = 1900;
const SCRUBBER_END_YEAR = 2100;

const PLANET_DATA = [
  { name:"Mercury", sub:"first planet · sol system",   color:"#b5b5b5", period:"88 Earth days",       distance:"0.39 AU",  diameter:"4,879 km",   moons:"0",   desc:"Smallest planet. Extreme temperature swings from -180°C to 430°C.",                            tex:2,  sz:0.06, r:0.22, spd:4.147, rot:0, shade:1 },
  { name:"Venus",   sub:"second planet · sol system",  color:"#e8c97a", period:"225 Earth days",      distance:"0.72 AU",  diameter:"12,104 km",  moons:"0",   desc:"Hottest planet at 465°C average. Thick CO₂ atmosphere with sulfuric acid clouds.",            tex:3,  sz:0.09, r:0.30, spd:1.626, rot:0, shade:1 },
  { name:"Earth",   sub:"third planet · sol system",   color:"#2d7dd2", period:"365.25 Earth days",   distance:"1.00 AU",  diameter:"12,742 km",  moons:"1",   desc:"Only known planet with life. 71% of surface covered by liquid water.",                       tex:5,  sz:0.10, r:0.42, spd:1.0,   rot:0, shade:1 },
  { name:"Mars",    sub:"fourth planet · sol system",  color:"#c1440e", period:"687 Earth days",      distance:"1.52 AU",  diameter:"6,779 km",   moons:"2",   desc:"Home to Olympus Mons, the largest volcano in the solar system at 22km tall.",                tex:6,  sz:0.07, r:0.54, spd:0.531, rot:0, shade:1 },
  { name:"Jupiter", sub:"fifth planet · sol system",   color:"#c88b3a", period:"11.86 Earth years",   distance:"5.20 AU",  diameter:"139,820 km", moons:"95",  desc:"Largest planet. The Great Red Spot is a storm that has raged for over 350 years.",          tex:7,  sz:0.22, r:0.72, spd:0.084, rot:0, shade:1 },
  { name:"Saturn",  sub:"sixth planet · sol system",   color:"#e4d191", period:"29.46 Earth years",   distance:"9.58 AU",  diameter:"116,460 km", moons:"146", desc:"Least dense planet — it would float on water. Rings made of ice and rock.",                  tex:8,  sz:0.19, r:0.88, spd:0.034, rot:0, shade:1 },
  { name:"Uranus",  sub:"seventh planet · sol system", color:"#7de8e8", period:"84 Earth years",      distance:"19.2 AU",  diameter:"50,724 km",  moons:"28",  desc:"Rotates on its side at 98° tilt. Coldest planetary atmosphere at -224°C.",                  tex:9,  sz:0.14, r:1.02, spd:0.012, rot:0, shade:1 },
  { name:"Neptune", sub:"eighth planet · sol system",  color:"#3f54ba", period:"164.8 Earth years",   distance:"30.05 AU", diameter:"49,244 km",  moons:"16",  desc:"Strongest winds in the solar system at 2,100 km/h. Has a storm called the Great Dark Spot.", tex:10, sz:0.13, r:1.15, spd:0.006, rot:0, shade:1 },
];

const MOON = { tex:11, sz:0.03, orbit_r:0.08, spd:13.37, rot:0 };

let planet_angles = new Array(PLANET_DATA.length).fill(0);
let planet_positions = new Array(PLANET_DATA.length).fill(null).map(() => ({ x:0, z:0 }));
let moon_angle = 0;
let sun_rot = 0;
let stars_rot = 0;

const VIEWS = {
  solar:  { x:0.0, y:0.08, z:0.55, fov:60 },
  system: { x:0.0, y:0.55, z:0.85, fov:65 },
  orrery: { x:0.0, y:1.8,  z:0.01, fov:72 },
};

const TEXTURE_KEYS = ["stars","sun","mercury","venus_surface","venus_atmo",
                      "earth","mars","jupiter","saturn","uranus","neptune","moon"];

let url_map = new Map([
  ["stars",         "2k_stars_milky_way.jpg"],
  ["sun",           "2k_sun.jpg"],
  ["mercury",       "2k_mercury.jpg"],
  ["venus_surface", "2k_venus_surface.jpg"],
  ["venus_atmo",    "2k_venus_atmosphere.jpg"],
  ["earth",         "2k_earth_daymap.jpg"],
  ["mars",          "2k_mars.jpg"],
  ["jupiter",       "2k_jupiter.jpg"],
  ["saturn",        "2k_saturn.jpg"],
  ["uranus",        "2k_uranus.jpg"],
  ["neptune",       "2k_neptune.jpg"],
  ["moon",          "2k_moon.jpg"],
]);

let ring_buffer = null;
const RING_VERTS = 260; // (STEPS + 1) * 2

// ============================================================
// Configure WebGL
// ============================================================
function configure() {
  canvas = document.getElementById("webgl-canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  webgl_context = canvas.getContext("webgl");
  program = initShaders(webgl_context, "vertex-shader", "fragment-shader");
  webgl_context.useProgram(program);
  webgl_context.viewport(0, 0, canvas.width, canvas.height);

  attr_vertex   = webgl_context.getAttribLocation(program, "vertex");
  attr_normal   = webgl_context.getAttribLocation(program, "normal");
  attr_texCoord = webgl_context.getAttribLocation(program, "texCoord");
  uniform_color           = webgl_context.getUniformLocation(program, "color");
  uniform_view            = webgl_context.getUniformLocation(program, "V");
  uniform_perspective     = webgl_context.getUniformLocation(program, "P");
  uniform_light           = webgl_context.getUniformLocation(program, "light");
  uniform_props           = webgl_context.getUniformLocation(program, "props");
  uniform_trans           = webgl_context.getUniformLocation(program, "trans");
  uniform_eye             = webgl_context.getUniformLocation(program, "eye");
  uniform_textureSampler  = webgl_context.getUniformLocation(program, "textureSampler");
  uniform_shading_enabled = webgl_context.getUniformLocation(program, "shading_enabled");
  uniform_alpha           = webgl_context.getUniformLocation(program, "u_alpha");
  uniform_solid_color     = webgl_context.getUniformLocation(program, "use_solid_color");

  webgl_context.enable(webgl_context.DEPTH_TEST);
  webgl_context.enable(webgl_context.BLEND);
  webgl_context.blendFunc(webgl_context.SRC_ALPHA, webgl_context.ONE_MINUS_SRC_ALPHA);

  buildRingBuffer();
  setupMouseInteraction();
  setupPlanetSymbols();
  setupDateScrubber();

  // Pre-compute initial planet positions so camera flies correctly on load
  for (let i = 0; i < PLANET_DATA.length; i++) {
    planet_positions[i] = { x: PLANET_DATA[i].r, z: 0 };
  }

  updateInfoCard(2);
  updatePlanetSymbols(2);

  const v = VIEWS.system;
  xt = v.x; yt = v.y; zt = v.z; fov = v.fov;
  syncSphericalFromCartesian();

  // Resize handler
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    webgl_context.viewport(0, 0, canvas.width, canvas.height);
  });
}

// ============================================================
// 2D Overlay Ring Drawing with Glow
// ============================================================
function buildRingBuffer() {
  // Build a ribbon quad strip for each ring
  // Each segment has 2 verts (inner + outer), connected as triangles
  const STEPS = 128;
  let verts = [];
  const INNER = 0.992;
  const OUTER = 1.008;
  for (let i = 0; i <= STEPS; i++) {
    const angle = (i / STEPS) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    // inner vertex (slightly inside radius, will be scaled by uniform)
    verts.push(cos * INNER, 0.0, sin * INNER);
    // outer vertex (slightly outside radius)
    verts.push(cos * OUTER, 0.0, sin * OUTER);
  }
  ring_buffer = webgl_context.createBuffer();
  webgl_context.bindBuffer(webgl_context.ARRAY_BUFFER, ring_buffer);
  webgl_context.bufferData(webgl_context.ARRAY_BUFFER, new Float32Array(verts), webgl_context.STATIC_DRAW);
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3), 16) / 255;
  const g = parseInt(hex.slice(3,5), 16) / 255;
  const b = parseInt(hex.slice(5,7), 16) / 255;
  return { r, g, b };
}

function drawRing(radius, planetIndex, selected) {
  webgl_context.uniform1i(uniform_solid_color, 1);
  webgl_context.bindBuffer(webgl_context.ARRAY_BUFFER, ring_buffer);
  webgl_context.vertexAttribPointer(attr_vertex, 3, webgl_context.FLOAT, false, 0, 0);
  webgl_context.uniform1i(uniform_shading_enabled, 0);
  webgl_context.uniform4f(uniform_trans, 0.0, 0.0, 0.0, 1.0);

  const { r, g, b } = hexToRgb(PLANET_DATA[planetIndex].color);

  if (selected || view_mode === 'orrery') {
    const passes = [
      { scale: radius * 1.02, alpha: 0.06 },
      { scale: radius * 1.01, alpha: 0.18 },
      { scale: radius,         alpha: 0.85 },
    ];
    for (const pass of passes) {
      webgl_context.uniform4f(uniform_color, r, g, b, 1.0);
      webgl_context.uniform1f(uniform_alpha, pass.alpha);
      webgl_context.uniform4f(uniform_props, 0.0, 0.0, 0.0, pass.scale);
      webgl_context.drawArrays(webgl_context.TRIANGLE_STRIP, 0, 258);
    }
  } else {
    webgl_context.uniform4f(uniform_color, 0.4, 0.5, 0.7, 1.0);
    webgl_context.uniform1f(uniform_alpha, 0.18);
    webgl_context.uniform4f(uniform_props, 0.0, 0.0, 0.0, radius);
    webgl_context.drawArrays(webgl_context.TRIANGLE_STRIP, 0, 258);
  }
}
// ============================================================
// Vertex/Normal/TexCoord data
// ============================================================
function createVertexData() {
  vertex_data = [];
  for (let i = 0; i < F.length; i++) {
    vertex_data.push(V[F[i][0]]); vertex_data.push(V[F[i][1]]); vertex_data.push(V[F[i][2]]);
  }
}

function createNormalData() {
  normal_data = [];
  for (let i = 0; i < F.length; i++) {
    normal_data.push(N[F[i][0]]); normal_data.push(N[F[i][1]]); normal_data.push(N[F[i][2]]);
  }
}

function createTexCoordData() {
  texCoord_data = [];
  for (let i = 0; i < F.length; i++) {
    for (let j = 0; j < 3; j++) {
      let v = V[F[i][j]];
      let theta = Math.atan2(v[0], v[2]);
      let phi = Math.atan2(Math.sqrt(v[0]*v[0] + v[2]*v[2]), v[1]);
      texCoord_data.push(vec2((theta + Math.PI) / (2 * Math.PI), phi / Math.PI));
    }
  }
}

function loadTextures() {
  TEXTURE_KEYS.forEach((name, index) => {
    let texture = webgl_context.createTexture();
    let image = new Image();
    image.onload = function() {
      webgl_context.bindTexture(webgl_context.TEXTURE_2D, texture);
      webgl_context.pixelStorei(webgl_context.UNPACK_FLIP_Y_WEBGL, true);
      webgl_context.texImage2D(webgl_context.TEXTURE_2D, 0, webgl_context.RGBA, webgl_context.RGBA, webgl_context.UNSIGNED_BYTE, image);
      webgl_context.generateMipmap(webgl_context.TEXTURE_2D);
      webgl_context.texParameteri(webgl_context.TEXTURE_2D, webgl_context.TEXTURE_MIN_FILTER, webgl_context.LINEAR_MIPMAP_LINEAR);
      webgl_context.texParameteri(webgl_context.TEXTURE_2D, webgl_context.TEXTURE_MAG_FILTER, webgl_context.LINEAR);
      webgl_context.texParameteri(webgl_context.TEXTURE_2D, webgl_context.TEXTURE_WRAP_S, webgl_context.CLAMP_TO_EDGE);
      webgl_context.texParameteri(webgl_context.TEXTURE_2D, webgl_context.TEXTURE_WRAP_T, webgl_context.CLAMP_TO_EDGE);
      webgl_context.bindTexture(webgl_context.TEXTURE_2D, null);
    };
    image.crossOrigin = "anonymous";
    image.src = url_map.get(name);
    textures[index] = texture;
  });
}

function allocateMemory() {
  window._vertex_buffer = webgl_context.createBuffer();
  webgl_context.bindBuffer(webgl_context.ARRAY_BUFFER, window._vertex_buffer);
  webgl_context.bufferData(webgl_context.ARRAY_BUFFER, flatten(vertex_data), webgl_context.STATIC_DRAW);
  webgl_context.vertexAttribPointer(attr_vertex, size, webgl_context.FLOAT, false, 0, 0);
  webgl_context.enableVertexAttribArray(attr_vertex);

  window._normal_buffer = webgl_context.createBuffer();
  webgl_context.bindBuffer(webgl_context.ARRAY_BUFFER, window._normal_buffer);
  webgl_context.bufferData(webgl_context.ARRAY_BUFFER, flatten(normal_data), webgl_context.STATIC_DRAW);
  webgl_context.vertexAttribPointer(attr_normal, size, webgl_context.FLOAT, false, 0, 0);
  webgl_context.enableVertexAttribArray(attr_normal);

  window._texCoord_buffer = webgl_context.createBuffer();
  webgl_context.bindBuffer(webgl_context.ARRAY_BUFFER, window._texCoord_buffer);
  webgl_context.bufferData(webgl_context.ARRAY_BUFFER, flatten(texCoord_data), webgl_context.STATIC_DRAW);
  webgl_context.vertexAttribPointer(attr_texCoord, 2, webgl_context.FLOAT, false, 0, 0);
  webgl_context.enableVertexAttribArray(attr_texCoord);
}

function restoreSphereBuffer() {
  webgl_context.uniform1i(uniform_solid_color, 0);
  webgl_context.bindBuffer(webgl_context.ARRAY_BUFFER, window._vertex_buffer);
  webgl_context.vertexAttribPointer(attr_vertex, size, webgl_context.FLOAT, false, 0, 0);
  webgl_context.bindBuffer(webgl_context.ARRAY_BUFFER, window._normal_buffer);
  webgl_context.vertexAttribPointer(attr_normal, size, webgl_context.FLOAT, false, 0, 0);
  webgl_context.bindBuffer(webgl_context.ARRAY_BUFFER, window._texCoord_buffer);
  webgl_context.vertexAttribPointer(attr_texCoord, 2, webgl_context.FLOAT, false, 0, 0);
}

function bindTexture(index, unit) {
  webgl_context.activeTexture(webgl_context.TEXTURE0 + unit);
  webgl_context.bindTexture(webgl_context.TEXTURE_2D, textures[index]);
  webgl_context.uniform1i(uniform_textureSampler, unit);
}

function drawSphere(tx, ty, tz, scale, rotY, texIndex, shading, alpha) {
  restoreSphereBuffer();
  bindTexture(texIndex, texIndex);
  webgl_context.uniform1i(uniform_shading_enabled, shading);
  webgl_context.uniform1f(uniform_alpha, alpha);
  webgl_context.uniform4f(uniform_trans, tx, ty, tz, 1.0);
  webgl_context.uniform4f(uniform_props, 0.0, rotY, 0.0, scale);
  webgl_context.drawArrays(webgl_context.TRIANGLES, 0, vertex_data.length);
}

// ============================================================
// Camera lerp with ease-in-out cubic
// ============================================================
function easeInOut(t) {
  return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;
}

function flyToPosition(tx, ty, tz, duration, onDone) {
  lerp_from = { x:xt, y:yt, z:zt };
  lerp_to   = { x:tx, y:ty, z:tz };
  lerp_start = performance.now();
  lerp_duration = duration || 2000;
  cam_lerping = true;
  cam_lerp_done_cb = onDone || null;
  document.querySelector(".hud-left").classList.add("hidden");
  document.querySelector(".hud-right").classList.add("hidden");
}

function tickLerp() {
  if (!cam_lerping) return;
  const t = Math.min((performance.now() - lerp_start) / lerp_duration, 1.0);
  const e = easeInOut(t);
  xt = lerp_from.x + (lerp_to.x - lerp_from.x) * e;
  yt = lerp_from.y + (lerp_to.y - lerp_from.y) * e;
  zt = lerp_from.z + (lerp_to.z - lerp_from.z) * e;
  if (t >= 1.0) {
    cam_lerping = false;
    syncSphericalFromCartesian();
    document.querySelector(".hud-left").classList.remove("hidden");
    document.querySelector(".hud-right").classList.remove("hidden");
    if (cam_lerp_done_cb) { cam_lerp_done_cb(); cam_lerp_done_cb = null; }
  }
}

// ============================================================
// Planet selection — central function linking symbol + ring + card
// ============================================================
function selectPlanet(index, flyTo) {
  selected_planet = index;
  updateInfoCard(index);
  updatePlanetSymbols(index);
  pulseInfoCard(index);
  if (flyTo) flyToPlanetSolar(index);
}

function flyToPlanetSolar(index) {
  const p = PLANET_DATA[index];
  // Read fresh positions directly instead of using cached planet_positions
  const positions = (use_real_positions && typeof getRealPlanetPositions === "function")
    ? getRealPlanetPositions(sim_date)
    : planet_positions;
  const pos = planet_positions[index];
  // Fixed offset behind the planet proportional to its size, capped so we never go inside it
  const offset = Math.max(p.sz * 2.5, 0.15);
  const tx = pos.x;
  const ty = Math.max(0.06, p.r * 0.15);
  const tz = pos.z + offset + p.r * 0.28;

  // widen FOV for outer planets so they're actually in frame
  fov =index >= 5 ? 80 : 60; // Saturn, Uranus, Nepture get wider view

  setView('solar', false);
  tracking_active = false; // pause tracking during lerp
  flyToPosition(tx, ty, tz, 2000, () => {
    tracking_active = true; // kick in after lerp lands
  });
}

function updatePlanetSymbols(index) {
  document.querySelectorAll('.planet-sym').forEach((el, i) => {
    el.classList.toggle('active', i === index);
  });
}

function pulseInfoCard(index) {
  const card = document.getElementById('info-card');
  const color = PLANET_DATA[index].color;
  card.style.borderColor = color;
  setTimeout(() => { card.style.borderColor = ''; }, 400);
}

function updateInfoCard(index) {
  const p = PLANET_DATA[index];
  document.getElementById("info-dot").style.background = p.color;
  document.getElementById("info-planet-name").textContent = p.name.toUpperCase();
  document.getElementById("info-planet-sub").textContent = p.sub;
  document.getElementById("info-period").textContent = p.period;
  document.getElementById("info-distance").textContent = p.distance;
  document.getElementById("info-diameter").textContent = p.diameter;
  document.getElementById("info-moons").textContent = p.moons;
  document.getElementById("info-desc").textContent = p.desc;
  document.getElementById("live-section").style.display = p.name === "Earth" ? "block" : "none";
}

// ============================================================
// Planet symbol bar
// ============================================================
function setupPlanetSymbols() {
  document.querySelectorAll('.planet-sym').forEach(el => {
    el.addEventListener('click', function() {
      selectPlanet(parseInt(this.dataset.index), true);
    });
  });
}

// ============================================================
// Date scrubber
// ============================================================
function setupDateScrubber() {
  const scrubber = document.getElementById('date-scrubber');
  if (!scrubber) return;
  const today = new Date();
  const totalYears = SCRUBBER_END_YEAR - SCRUBBER_START_YEAR;
  const currentYears = today.getFullYear() - SCRUBBER_START_YEAR + (today.getMonth() / 12);
  scrubber.value = (currentYears / totalYears) * 100;

  scrubber.addEventListener('input', function() {
    if (time_mode !== 'simulated') return;
    const pct = parseFloat(this.value) / 100;
    const year = SCRUBBER_START_YEAR + pct * (SCRUBBER_END_YEAR - SCRUBBER_START_YEAR);
    sim_date = new Date(Date.UTC(Math.floor(year), Math.floor((year % 1) * 12), 1));
    use_real_positions = true;
    updateSimDateDisplay();
  });
}

function snapToToday() {
  sim_date = new Date();
  updateSimDateDisplay();
  const scrubber = document.getElementById('date-scrubber');
  if (scrubber) {
    const today = new Date();
    const totalYears = SCRUBBER_END_YEAR - SCRUBBER_START_YEAR;
    const currentYears = today.getFullYear() - SCRUBBER_START_YEAR + (today.getMonth() / 12);
    scrubber.value = (currentYears / totalYears) * 100;
  }
}

// ============================================================
// Time mode
// ============================================================
function setTimeMode(mode) {
  time_mode = mode;
  const simBtn = document.getElementById('btn-simulated');
  const liveBtn = document.getElementById('btn-live');
  const scrubSection = document.getElementById('scrubber-section');
  const dateEl = document.getElementById('sim-date');

  if (mode === 'live') {
    simBtn.classList.remove('active');
    liveBtn.classList.add('active', 'live');
    scrubSection.style.display = 'none';
    use_real_positions = true;
    sim_date = new Date();
    dateEl.classList.add('live-date');
  } else {
    liveBtn.classList.remove('active', 'live');
    simBtn.classList.add('active');
    scrubSection.style.display = 'block';
    use_real_positions = false;
    dateEl.classList.remove('live-date');
  }
}

function updateSimDateDisplay() {
  if (typeof formatSimDate === "function") {
    document.getElementById("sim-date").textContent = formatSimDate(sim_date);
  }
  if (typeof getDayOfYear === "function") {
    document.getElementById("sim-day").textContent = "DAY " + getDayOfYear(sim_date);
  }
}

function tickSimDate() {
  if (time_mode === 'live') {
    sim_date = new Date();
    updateSimDateDisplay();
    return;
  }
  const now = performance.now();
  const real_ms = now - last_frame_time;
  last_frame_time = now;
  const days_per_real_second = 10 * orbit_speed_crd;
  sim_date = new Date(sim_date.getTime() + (real_ms / 1000) * days_per_real_second * 86400000);
  updateSimDateDisplay();
}

// ============================================================
// Mouse interaction
// ============================================================
let hover_label = null;
let _last_VP = null, _last_P = null;

// Spherical coords — synced from xt/yt/zt
let cam_theta = 0;
let cam_phi = 0.3;
let cam_radius = 1.0;
let is_dragging = false;
let drag_start = { x: 0, y: 0 };
let drag_moved = false;

function syncSphericalFromCartesian() {
  cam_radius = Math.sqrt(xt*xt + yt*yt + zt*zt);
  cam_theta = Math.atan2(xt, zt);
  cam_phi = Math.asin(Math.max(-1, Math.min(1, yt / cam_radius)));
}

function syncCartesianFromSpherical() {
  xt = cam_radius * Math.sin(cam_theta) * Math.cos(cam_phi);
  yt = cam_radius * Math.sin(cam_phi);
  zt = cam_radius * Math.cos(cam_theta) * Math.cos(cam_phi);
}

function setupMouseInteraction() {
  hover_label = document.getElementById("planet-label");

  canvas.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    is_dragging = true;
    drag_moved = false;
    drag_start = { x: e.clientX, y: e.clientY };
    canvas.style.cursor = "grabbing";
  });

  canvas.addEventListener('mousemove', e => {
    // hover labels
    if (!cam_lerping && _last_VP && _last_P) {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      let found = false;
      for (let i = 0; i < PLANET_DATA.length; i++) {
        const sp = worldToScreen(planet_positions[i].x, 0, planet_positions[i].z);
        if (!sp) continue;
        const ddx = mx - sp.x, ddy = my - sp.y;
        if (Math.sqrt(ddx*ddx+ddy*ddy) < Math.max(PLANET_DATA[i].sz * canvas.height * 0.4, 18)) {
          hover_label.style.display = "block";
          hover_label.style.left = (sp.x + 14) + "px";
          hover_label.style.top  = (sp.y - 8) + "px";
          hover_label.textContent = PLANET_DATA[i].name;
          if (!is_dragging) canvas.style.cursor = "pointer";
          found = true; break;
        }
      }
      if (!found && !is_dragging) { hover_label.style.display = "none"; canvas.style.cursor = "default"; }
      if (!found && is_dragging)  { hover_label.style.display = "none"; }
    }

    // orbital drag
    if (!is_dragging || cam_lerping || view_mode === 'orrery') return;

    const dx = e.clientX - drag_start.x;
    const dy = e.clientY - drag_start.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag_moved = true;
    drag_start = { x: e.clientX, y: e.clientY };

    cam_theta -= dx * 0.005;
    cam_phi = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, cam_phi + dy * 0.005));
    syncCartesianFromSpherical();
    tracking_active = false;
  });

  canvas.addEventListener('mouseup', e => {
    is_dragging = false;
    canvas.style.cursor = "default";

    if (drag_moved) return; // was a drag, not a click

    if (cam_lerping) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    for (let i = 0; i < PLANET_DATA.length; i++) {
      const sp = worldToScreen(planet_positions[i].x, 0, planet_positions[i].z);
      if (!sp) continue;
      const dx = mx - sp.x, dy = my - sp.y;
      if (Math.sqrt(dx*dx+dy*dy) < Math.max(PLANET_DATA[i].sz * canvas.height * 0.4, 18)) {
        if (view_mode === 'solar') selectPlanet(i, true);
        else selectPlanet(i, false);
        break;
      }
    }
  });

  canvas.addEventListener('mouseleave', () => {
    is_dragging = false;
    canvas.style.cursor = "default";
    hover_label.style.display = "none";
  });

  // scroll to zoom
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    if (cam_lerping || view_mode === 'orrery') return;
    const sensitivity = view_mode === 'solar' ? 0.0003 : 0.001;
    cam_radius = Math.max(0.15, Math.min(8.0, cam_radius + e.deltaY * sensitivity));
    syncCartesianFromSpherical();
  }, { passive: false });

  // touch support
  let last_touch = null;
  canvas.addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
      last_touch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      drag_moved = false;
    }
  });
  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (e.touches.length === 1 && last_touch && !cam_lerping && view_mode !== 'orrery') {
      const dx = e.touches[0].clientX - last_touch.x;
      const dy = e.touches[0].clientY - last_touch.y;
      drag_moved = true;
      last_touch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      cam_theta -= dx * 0.005;
      cam_phi = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, cam_phi + dy * 0.005));
      syncCartesianFromSpherical();
      tracking_active = false;
    }
  }, { passive: false });
  canvas.addEventListener('touchend', () => { last_touch = null; });
}

function worldToScreen(wx, wy, wz) {
  if (!_last_VP || !_last_P) return null;
  let clip = mult(_last_P, mult(_last_VP, vec4(wx, wy, wz, 1.0)));
  if (clip[3] <= 0) return null;
  return {
    x: (clip[0]/clip[3] * 0.5 + 0.5) * canvas.width,
    y: (1.0 - (clip[1]/clip[3] * 0.5 + 0.5)) * canvas.height
  };
}

// ============================================================
// Main draw loop
// ============================================================
function draw() {
  tickLerp();
  tickSimDate();

      // Planet tracking - follows selected planet in solar view
  if (view_mode === 'solar' && tracking_active && !cam_lerping) {
    const pos = planet_positions[selected_planet];
    const p = PLANET_DATA[selected_planet];
    const offset = Math.max(p.sz * 2.5, 0.15);
    xt += (pos.x - xt) * 0.05;
    zt += (pos.z + offset - zt) * 0.05;
    yt += (0.06 - yt) * 0.05;
  }

  webgl_context.clear(webgl_context.DEPTH_BUFFER_BIT | webgl_context.COLOR_BUFFER_BIT);

  let eye = vec3(xt, yt, zt);
  let Vm = lookAt(eye, vec3(0,0,0), up);
  let P  = perspective(fov, canvas.width / canvas.height, 0.01, 200.0);
  _last_VP = Vm; _last_P = P;

  webgl_context.uniformMatrix4fv(uniform_view, false, flatten(Vm));
  webgl_context.uniformMatrix4fv(uniform_perspective, false, flatten(P));
  webgl_context.uniform3f(uniform_eye, xt, yt, zt);
  webgl_context.uniform4fv(uniform_light, vec4(lxt, lyt, lzt, 0.0));

  // Skybox
  stars_rot = (stars_rot + 0.003) % 360;
  drawSphere(0, 0, 0, 50.0, radians(stars_rot), 0, 0, 1.0);

  // Sun
  sun_rot = (sun_rot + 0.3) % 360;
  drawSphere(0, 0, 0, 0.35, radians(sun_rot), 1, 0, 1.0);

  // Planets
  let real_pos = null;
  if (use_real_positions && typeof getRealPlanetPositions === "function") {
    real_pos = getRealPlanetPositions(sim_date);
  }

  const base_speed = 0.4 * orbit_speed_crd;
  let earth_x = 0, earth_z = 0;

  for (let i = 0; i < PLANET_DATA.length; i++) {
    const p = PLANET_DATA[i];
    p.rot = (p.rot + 1.5) % 360;
    let px, pz;
    if (real_pos) {
      px = real_pos[i].x; pz = real_pos[i].z;
    } else {
      planet_angles[i] = (planet_angles[i] + base_speed * p.spd) % 360;
      const theta = radians(planet_angles[i]);
      px = p.r * Math.cos(theta); pz = p.r * Math.sin(theta);
    }
    planet_positions[i] = { x:px, z:pz };

    if (p.name === "Earth") {
      earth_x = px; earth_z = pz;
      document.getElementById("live-angle").textContent = Math.atan2(pz, px).toFixed(2) + " rad";
      document.getElementById("live-x").textContent = px.toFixed(2);
      document.getElementById("live-z").textContent = pz.toFixed(2);
    }

    drawRing(PLANET_DATA[i].r, i, i === selected_planet);

    drawSphere(px, 0, pz, p.sz, radians(p.rot), p.tex, p.shade, 1.0);
    if (p.name === "Venus") drawSphere(px, 0, pz, p.sz*1.05, radians(p.rot*0.7), 4, 0, 0.35);
  }

  // Moon
  moon_angle = (moon_angle + base_speed * MOON.spd) % 360;
  MOON.rot = (MOON.rot + 3) % 360;
  const mt = radians(moon_angle);
  drawSphere(earth_x + MOON.orbit_r*Math.cos(mt), 0, earth_z + MOON.orbit_r*Math.sin(mt), MOON.sz, radians(MOON.rot), 11, 1, 1.0);

}

// ============================================================
// View toggle
// ============================================================
function setView(mode, animate = true) {
  view_mode = mode;
  tracking_active = false; // stop tracking on any view change
  const v = VIEWS[mode];
  fov = v.fov;
  if (animate) flyToPosition(v.x, v.y, v.z, 2000);
  else { xt = v.x; yt = v.y; zt = v.z; }
  ['solar','system','orrery'].forEach(m => {
    const btn = document.getElementById('btn-' + m);
    if (btn) btn.classList.toggle('active', m === mode);
  });
}

// ============================================================
// Grand Tour
// ============================================================
function startGrandTour() {
  if (grand_tour_active) { stopGrandTour(); return; }
  grand_tour_active = true;
  grand_tour_index = 0;
  document.getElementById("btn-tour").classList.add("active");

  // lock to live real positions so planets don't drift mid-lerp
  _tour_prev_time_mode = time_mode;
  _tour_prev_real_positions = use_real_positions;
  use_real_positions = true;
  time_mode = 'live';

  tourNext();
}

function tourNext() {
  if (!grand_tour_active || grand_tour_index >= PLANET_DATA.length) { stopGrandTour(); return; }
  selectPlanet(grand_tour_index, true);
  grand_tour_index++;
  grand_tour_timer = setTimeout(tourNext, 4500);
}

function stopGrandTour() {
  grand_tour_active = false;
  clearTimeout(grand_tour_timer);
  document.getElementById("btn-tour").classList.remove("active");

  // restore whatever the user had before
  time_mode = _tour_prev_time_mode || 'simulated';
  use_real_positions = _tour_prev_real_positions || false;
}

// ============================================================
// Reset buttons
// ============================================================
document.getElementById("reset_cl").addEventListener("click", function() {
  const v = VIEWS[view_mode];
  xt = v.x; yt = v.y; zt = v.z; fov = v.fov;
  document.getElementById("fov").value = v.fov;
  document.getElementById("fovy").textContent = v.fov + "°";
});
document.getElementById("reset_ss").addEventListener("click", function() {
  orbit_speed_crd = 1.0;
  document.getElementById("os").value = 1.0;
  document.getElementById("os_crd").textContent = "1.0x";
});

// ============================================================
// Init
// ============================================================
createVertexData();
createNormalData();
createTexCoordData();
configure();
loadTextures();
allocateMemory();
function loop() {
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);