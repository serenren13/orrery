console.clear();

let webgl_context = null;
let program = null;
let canvas = null;
let attr_vertex = null;
let attr_normal = null;
let attr_texCoord = null;
let uniform_color = null;
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

// Camera current position
let xt = 0.0, yt = 0.2, zt = 0.6;
let fov = 60;

// Camera lerp targets
let cam_target_x = 0.0;
let cam_target_y = 0.2;
let cam_target_z = 0.6;
let cam_lerping = false;
let cam_lerp_done_cb = null;

// Light at origin (sun)
const lxt = 0.0, lyt = 0.0, lzt = 0.0;
const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);

// View modes
let view_mode = "solar"; // "solar" or "orrery"

// Selected planet index (2 = earth by default)
let selected_planet = 2;

// Grand tour
let grand_tour_active = false;
let grand_tour_index = 0;
let grand_tour_timer = null;

// Planet data with real astronomical facts
const PLANET_DATA = [
  {
    name: "Mercury", sub: "first planet · sol system",
    color: "#b5b5b5",
    period: "88 Earth days", distance: "0.39 AU",
    diameter: "4,879 km", moons: "0",
    desc: "Smallest planet. Extreme temperature swings from -180°C to 430°C.",
    tex: 2, sz: 0.06, r: 0.22, spd: 4.147, rot: 0, shade: 1
  },
  {
    name: "Venus", sub: "second planet · sol system",
    color: "#e8c97a",
    period: "225 Earth days", distance: "0.72 AU",
    diameter: "12,104 km", moons: "0",
    desc: "Hottest planet at 465°C average. Thick CO₂ atmosphere with sulfuric acid clouds.",
    tex: 3, sz: 0.09, r: 0.30, spd: 1.626, rot: 0, shade: 1
  },
  {
    name: "Earth", sub: "third planet · sol system",
    color: "#2d7dd2",
    period: "365.25 Earth days", distance: "1.00 AU",
    diameter: "12,742 km", moons: "1",
    desc: "Only known planet with life. 71% of surface covered by liquid water.",
    tex: 5, sz: 0.10, r: 0.42, spd: 1.0, rot: 0, shade: 1
  },
  {
    name: "Mars", sub: "fourth planet · sol system",
    color: "#c1440e",
    period: "687 Earth days", distance: "1.52 AU",
    diameter: "6,779 km", moons: "2",
    desc: "Home to Olympus Mons, the largest volcano in the solar system at 22km tall.",
    tex: 6, sz: 0.07, r: 0.54, spd: 0.531, rot: 0, shade: 1
  },
  {
    name: "Jupiter", sub: "fifth planet · sol system",
    color: "#c88b3a",
    period: "11.86 Earth years", distance: "5.20 AU",
    diameter: "139,820 km", moons: "95",
    desc: "Largest planet. The Great Red Spot is a storm that has raged for over 350 years.",
    tex: 7, sz: 0.22, r: 0.72, spd: 0.084, rot: 0, shade: 1
  },
  {
    name: "Saturn", sub: "sixth planet · sol system",
    color: "#e4d191",
    period: "29.46 Earth years", distance: "9.58 AU",
    diameter: "116,460 km", moons: "146",
    desc: "Least dense planet — it would float on water. Rings made of ice and rock.",
    tex: 8, sz: 0.19, r: 0.88, spd: 0.034, rot: 0, shade: 1
  },
  {
    name: "Uranus", sub: "seventh planet · sol system",
    color: "#7de8e8",
    period: "84 Earth years", distance: "19.2 AU",
    diameter: "50,724 km", moons: "28",
    desc: "Rotates on its side at 98° tilt. Coldest planetary atmosphere at -224°C.",
    tex: 9, sz: 0.14, r: 1.02, spd: 0.012, rot: 0, shade: 1
  },
  {
    name: "Neptune", sub: "eighth planet · sol system",
    color: "#3f54ba",
    period: "164.8 Earth years", distance: "30.05 AU",
    diameter: "49,244 km", moons: "16",
    desc: "Strongest winds in the solar system at 2,100 km/h. Has a storm called the Great Dark Spot.",
    tex: 10, sz: 0.13, r: 1.15, spd: 0.006, rot: 0, shade: 1
  },
];

const MOON = { tex: 11, sz: 0.03, orbit_r: 0.08, spd: 13.37, rot: 0 };

let planet_angles = new Array(PLANET_DATA.length).fill(0);
let planet_positions = new Array(PLANET_DATA.length).fill(null).map(() => ({ x: 0, z: 0 }));
let moon_angle = 0;
let sun_rot = 0;
let stars_rot = 0;

// Orbit controls (Earth specifically, legacy)
let orbit_speed_crd = 3;
let orbit_radius_crd = 1.0;
let orbit_angle_crd = 0;

// Camera view presets
const VIEWS = {
  solar: { x: 0.0, y: 0.15, z: 0.65, fov: 60 },
  orrery: { x: 0.0, y: 1.8, z: 0.01, fov: 75 },
};

const TEXTURE_KEYS = [
  "stars", "sun", "mercury", "venus_surface", "venus_atmo",
  "earth", "mars", "jupiter", "saturn", "uranus", "neptune", "moon"
];

let url_map = new Map();
url_map.set("stars",         "2k_stars_milky_way.jpg");
url_map.set("sun",           "2k_sun.jpg");
url_map.set("mercury",       "2k_mercury.jpg");
url_map.set("venus_surface", "2k_venus_surface.jpg");
url_map.set("venus_atmo",    "2k_venus_atmosphere.jpg");
url_map.set("earth",         "2k_earth_daymap.jpg");
url_map.set("mars",          "2k_mars.jpg");
url_map.set("jupiter",       "2k_jupiter.jpg");
url_map.set("saturn",        "2k_saturn.jpg");
url_map.set("uranus",        "2k_uranus.jpg");
url_map.set("neptune",       "2k_neptune.jpg");
url_map.set("moon",          "2k_moon.jpg");

// Ring buffer
let ring_buffer = null;
const RING_SEGMENTS = 128;

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

  webgl_context.enable(webgl_context.DEPTH_TEST);
  webgl_context.enable(webgl_context.BLEND);
  webgl_context.blendFunc(webgl_context.SRC_ALPHA, webgl_context.ONE_MINUS_SRC_ALPHA);

  buildRingBuffer();
  setupMouseInteraction();
  updateInfoCard(selected_planet);

  // Start on Earth
  flyToPlanet(2, false);
}

function buildRingBuffer() {
  let points = [];
  for (let i = 0; i <= RING_SEGMENTS; i++) {
    let angle = (i / RING_SEGMENTS) * 2 * Math.PI;
    points.push(Math.cos(angle), 0.0, Math.sin(angle));
  }
  ring_buffer = webgl_context.createBuffer();
  webgl_context.bindBuffer(webgl_context.ARRAY_BUFFER, ring_buffer);
  webgl_context.bufferData(webgl_context.ARRAY_BUFFER, new Float32Array(points), webgl_context.STATIC_DRAW);
}

function drawRing(radius) {
  webgl_context.bindBuffer(webgl_context.ARRAY_BUFFER, ring_buffer);
  webgl_context.vertexAttribPointer(attr_vertex, 3, webgl_context.FLOAT, false, 0, 0);
  webgl_context.uniform1i(uniform_shading_enabled, 0);
  webgl_context.uniform1f(uniform_alpha, 0.18);
  webgl_context.uniform4f(uniform_trans, 0.0, 0.0, 0.0, 1.0);
  webgl_context.uniform4f(uniform_props, 0.0, 0.0, 0.0, radius);
  webgl_context.drawArrays(webgl_context.LINE_STRIP, 0, RING_SEGMENTS + 1);
}

function restoreSphereBuffer() {
  webgl_context.bindBuffer(webgl_context.ARRAY_BUFFER, window._vertex_buffer);
  webgl_context.vertexAttribPointer(attr_vertex, size, webgl_context.FLOAT, false, 0, 0);
  webgl_context.bindBuffer(webgl_context.ARRAY_BUFFER, window._normal_buffer);
  webgl_context.vertexAttribPointer(attr_normal, size, webgl_context.FLOAT, false, 0, 0);
  webgl_context.bindBuffer(webgl_context.ARRAY_BUFFER, window._texCoord_buffer);
  webgl_context.vertexAttribPointer(attr_texCoord, 2, webgl_context.FLOAT, false, 0, 0);
}

function createVertexData() {
  vertex_data = [];
  for (let i = 0; i < F.length; i++) {
    vertex_data.push(V[F[i][0]]);
    vertex_data.push(V[F[i][1]]);
    vertex_data.push(V[F[i][2]]);
  }
}

function createNormalData() {
  normal_data = [];
  for (let i = 0; i < F.length; i++) {
    normal_data.push(N[F[i][0]]);
    normal_data.push(N[F[i][1]]);
    normal_data.push(N[F[i][2]]);
  }
}

function createTexCoordData() {
  texCoord_data = [];
  for (let i = 0; i < F.length; i++) {
    for (let j = 0; j < 3; j++) {
      let v = V[F[i][j]];
      let theta = Math.atan2(v[0], v[2]);
      let phi = Math.atan2(Math.sqrt(v[0]*v[0] + v[2]*v[2]), v[1]);
      let u = (theta + Math.PI) / (2 * Math.PI);
      let vc = phi / Math.PI;
      texCoord_data.push(vec2(u, vc));
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
      webgl_context.texImage2D(webgl_context.TEXTURE_2D, 0, webgl_context.RGBA,
        webgl_context.RGBA, webgl_context.UNSIGNED_BYTE, image);
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

// Ease in-out cubic
function easeInOut(t) {
  return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;
}

// Camera lerp state
let lerp_start = null;
let lerp_from = null;
let lerp_to = null;
let lerp_duration = 2000;

function flyToPosition(tx, ty, tz, duration, onDone) {
  lerp_from = { x: xt, y: yt, z: zt };
  lerp_to = { x: tx, y: ty, z: tz };
  lerp_start = performance.now();
  lerp_duration = duration || 2000;
  cam_lerping = true;
  cam_lerp_done_cb = onDone || null;

  // Fade out HUD
  document.querySelector(".hud-left").classList.add("hidden");
  document.querySelector(".hud-right").classList.add("hidden");
}

function flyToPlanet(index, animate) {
  selected_planet = index;
  updateInfoCard(index);
  const p = PLANET_DATA[index];
  const pos = planet_positions[index];
  const offset = p.sz * 3.5;
  const tx = pos.x * 0.95;
  const ty = 0.08;
  const tz = pos.z + offset + p.sz * 2;
  if (animate) {
    flyToPosition(tx, ty, tz, 2000);
  } else {
    xt = tx; yt = ty; zt = tz;
  }
}

function tickLerp() {
  if (!cam_lerping) return;
  const now = performance.now();
  const elapsed = now - lerp_start;
  const t = Math.min(elapsed / lerp_duration, 1.0);
  const e = easeInOut(t);
  xt = lerp_from.x + (lerp_to.x - lerp_from.x) * e;
  yt = lerp_from.y + (lerp_to.y - lerp_from.y) * e;
  zt = lerp_from.z + (lerp_to.z - lerp_from.z) * e;

  if (t >= 1.0) {
    cam_lerping = false;
    // Fade HUD back in
    document.querySelector(".hud-left").classList.remove("hidden");
    document.querySelector(".hud-right").classList.remove("hidden");
    if (cam_lerp_done_cb) { cam_lerp_done_cb(); cam_lerp_done_cb = null; }
  }
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
  if (p.name === "Earth") {
    document.getElementById("live-angle").textContent = "—";
    document.getElementById("live-x").textContent = "—";
    document.getElementById("live-z").textContent = "—";
    document.getElementById("live-section").style.display = "block";
  } else {
    document.getElementById("live-section").style.display = "none";
  }
}

// Hover label
let hover_label = null;
function setupMouseInteraction() {
  hover_label = document.getElementById("planet-label");

  canvas.addEventListener("mousemove", function(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let found = false;

    for (let i = 0; i < PLANET_DATA.length; i++) {
      const sp = worldToScreen(planet_positions[i].x, 0, planet_positions[i].z);
      if (!sp) continue;
      const dx = mx - sp.x;
      const dy = my - sp.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const screenRadius = PLANET_DATA[i].sz * canvas.height * 0.5;
      if (dist < Math.max(screenRadius, 18)) {
        hover_label.style.display = "block";
        hover_label.style.left = (sp.x + 16) + "px";
        hover_label.style.top = (sp.y - 10) + "px";
        hover_label.textContent = PLANET_DATA[i].name;
        canvas.style.cursor = "pointer";
        found = true;
        break;
      }
    }
    if (!found) {
      hover_label.style.display = "none";
      canvas.style.cursor = "default";
    }
  });

  canvas.addEventListener("click", function(e) {
    if (cam_lerping) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    for (let i = 0; i < PLANET_DATA.length; i++) {
      const sp = worldToScreen(planet_positions[i].x, 0, planet_positions[i].z);
      if (!sp) continue;
      const dx = mx - sp.x;
      const dy = my - sp.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const screenRadius = PLANET_DATA[i].sz * canvas.height * 0.5;
      if (dist < Math.max(screenRadius, 18)) {
        flyToPlanet(i, true);
        break;
      }
    }
  });
}

// Project world coords to screen
let _last_VP = null;
let _last_P = null;
function worldToScreen(wx, wy, wz) {
  if (!_last_VP || !_last_P) return null;
  let pos = vec4(wx, wy, wz, 1.0);
  let clip = mult(_last_P, mult(_last_VP, pos));
  if (clip[3] <= 0) return null;
  let ndcX = clip[0] / clip[3];
  let ndcY = clip[1] / clip[3];
  return {
    x: (ndcX * 0.5 + 0.5) * canvas.width,
    y: (1.0 - (ndcY * 0.5 + 0.5)) * canvas.height
  };
}

function draw() {
  tickLerp();

  webgl_context.clear(webgl_context.DEPTH_BUFFER_BIT | webgl_context.COLOR_BUFFER_BIT);

  let eye = vec3(xt, yt, zt);
  let Vm = lookAt(eye, vec3(0, 0, 0), up);
  let P  = perspective(fov, canvas.width / canvas.height, 0.01, 200.0);

  _last_VP = Vm;
  _last_P  = P;

  webgl_context.uniformMatrix4fv(uniform_view, false, flatten(Vm));
  webgl_context.uniformMatrix4fv(uniform_perspective, false, flatten(P));
  webgl_context.uniform3f(uniform_eye, xt, yt, zt);
  webgl_context.uniform4fv(uniform_light, vec4(lxt, lyt, lzt, 0.0));

  // Skybox
  stars_rot = (stars_rot + 0.005) % 360;
  drawSphere(0, 0, 0, 50.0, radians(stars_rot), 0, 0, 1.0);

  // Orbital rings
  for (let i = 0; i < PLANET_DATA.length; i++) {
    drawRing(PLANET_DATA[i].r);
  }
  restoreSphereBuffer();

  // Sun
  sun_rot = (sun_rot + 0.3) % 360;
  drawSphere(0, 0, 0, 0.35, radians(sun_rot), 1, 0, 1.0);

  let base_speed = 0.4 * orbit_speed_crd;
  let earth_x = 0, earth_z = 0;

  for (let i = 0; i < PLANET_DATA.length; i++) {
    const p = PLANET_DATA[i];
    planet_angles[i] = (planet_angles[i] + base_speed * p.spd) % 360;
    p.rot = (p.rot + 2) % 360;

    const theta = radians(planet_angles[i]);
    const px = p.r * Math.cos(theta);
    const pz = p.r * Math.sin(theta);

    planet_positions[i] = { x: px, z: pz };

    if (p.name === "Earth") {
      earth_x = px; earth_z = pz;
      document.getElementById("live-angle").textContent = theta.toFixed(2) + " rad";
      document.getElementById("live-x").textContent = px.toFixed(2);
      document.getElementById("live-z").textContent = pz.toFixed(2);
    }

    drawSphere(px, 0, pz, p.sz, radians(p.rot), p.tex, p.shade, 1.0);

    if (p.name === "Venus") {
      drawSphere(px, 0, pz, p.sz * 1.05, radians(p.rot * 0.7), 4, 0, 0.35);
    }
  }

  // Moon
  moon_angle = (moon_angle + base_speed * MOON.spd) % 360;
  MOON.rot = (MOON.rot + 3) % 360;
  const mt = radians(moon_angle);
  const mx = earth_x + MOON.orbit_r * Math.cos(mt);
  const mz = earth_z + MOON.orbit_r * Math.sin(mt);
  drawSphere(mx, 0, mz, MOON.sz, radians(MOON.rot), 11, 1, 1.0);
}

// View toggle
function setView(mode) {
  view_mode = mode;
  const v = VIEWS[mode];
  flyToPosition(v.x, v.y, v.z, 2500);
  fov = v.fov;
  document.getElementById("btn-solar").classList.toggle("active", mode === "solar");
  document.getElementById("btn-orrery").classList.toggle("active", mode === "orrery");
}

// Grand Tour
function startGrandTour() {
  grand_tour_active = true;
  grand_tour_index = 0;
  document.getElementById("btn-tour").classList.add("active");
  tourNext();
}

function tourNext() {
  if (!grand_tour_active || grand_tour_index >= PLANET_DATA.length) {
    grand_tour_active = false;
    document.getElementById("btn-tour").classList.remove("active");
    return;
  }
  flyToPlanet(grand_tour_index, true);
  grand_tour_index++;
  grand_tour_timer = setTimeout(tourNext, 4000);
}

function stopGrandTour() {
  grand_tour_active = false;
  clearTimeout(grand_tour_timer);
  document.getElementById("btn-tour").classList.remove("active");
}

// Reset buttons (from listeners.js will also call these)
document.getElementById("reset_cl").addEventListener("click", function() {
  xt = VIEWS.solar.x; yt = VIEWS.solar.y; zt = VIEWS.solar.z; fov = VIEWS.solar.fov;
});
document.getElementById("reset_ss").addEventListener("click", function() {
  orbit_speed_crd = 3.0; orbit_radius_crd = 1.0; orbit_angle_crd = 0;
});

createVertexData();
createNormalData();
createTexCoordData();
configure();
loadTextures();
allocateMemory();
setInterval(draw, 33);