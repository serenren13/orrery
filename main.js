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

let planet_angles = new Array(PLANET_DATA.length).fill(0);
let planet_positions = new Array(PLANET_DATA.length).fill(null).map(() => ({ x:0, z:0 }));
let moon_angle = 0;
let sun_rot = 0;
let stars_rot = 0;

const VIEWS = {
  solar:  { x:0.0, y:0.15, z:0.55, fov:60 },
  system: { x:0.0, y:0.55, z:0.85, fov:65 },
  orrery: { x:0.0, y:1.8,  z:0.01, fov:72 },
};

const TEXTURE_KEYS = ["stars","sun","mercury","venus_surface","venus_atmo",
                      "earth","mars","jupiter","saturn","uranus","neptune","moon"];

let url_map = new Map([
  ["stars",         "textures/2k_stars_milky_way.jpg"],
  ["sun",           "textures/2k_sun.jpg"],
  ["mercury",       "textures/2k_mercury.jpg"],
  ["venus_surface", "textures/2k_venus_surface.jpg"],
  ["venus_atmo",    "textures/2k_venus_atmosphere.jpg"],
  ["earth",         "textures/2k_earth_daymap.jpg"],
  ["mars",          "textures/2k_mars.jpg"],
  ["jupiter",       "textures/2k_jupiter.jpg"],
  ["saturn",        "textures/2k_saturn.jpg"],
  ["uranus",        "textures/2k_uranus.jpg"],
  ["neptune",       "textures/2k_neptune.jpg"],
  ["moon",          "textures/2k_moon.jpg"],
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
  document.getElementById('scrubber-section').style.display = mode === 'live' ? 'none' : 'block';
  document.getElementById('sim-date').classList.toggle('live-date', mode === 'live');

  if (mode === 'live') {
    liveBtn.classList.add('active', 'live');
    simBtn.classList.remove('active');
    sim_date = new Date();
    use_real_positions = true;
  } else {
    simBtn.classList.add('active');
    liveBtn.classList.remove('active', 'live');
    use_real_positions = false;
  }

  if (view_mode === 'solar') flyToPlanetSolar(selected_planet);
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

// ============================================================
// Main draw loop
// ============================================================
function draw() {
  tickLerp();
  tickSimDate();

      // Planet tracking - follows selected planet in solar view
  if (view_mode === 'solar' && tracking_active && !cam_lerping) {
    const cam = cameraFor(selected_planet);
    xt += (cam.tx - xt) * 0.05;
    yt += (cam.ty - yt) * 0.05;
    zt += (cam.tz - zt) * 0.05;
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
// Cinematic landing overlay
// ============================================================
function initLanding() {
  // populate Julian date
  const now = new Date();
  const jd = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  document.getElementById('landing-date').textContent = `J${now.getFullYear()}.${jd}`;

  // populate observer lat/lon if available
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      document.getElementById('landing-lat').textContent = `${pos.coords.latitude.toFixed(1)}°`;
      document.getElementById('landing-lon').textContent = `${pos.coords.longitude.toFixed(1)}°`;
    });
  }

  document.getElementById('btn-enter').addEventListener('click', () => {
    const overlay = document.getElementById('landing-overlay');
    overlay.classList.add('fade-out');
    setTimeout(() => { overlay.style.display = 'none'; }, 1200);
  });
}


// ============================================================
// Init
// ============================================================
createVertexData();
createNormalData();
createTexCoordData();
configure();
loadTextures();
allocateMemory();
initLanding();
function loop() {
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);