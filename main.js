console.clear();

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