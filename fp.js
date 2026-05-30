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

// Camera
let xt = 0.0;
let yt = 0.0;
let zt = 1.0;
let fov = 85;

// Light (at origin = sun)
const lxt = 0.0;
const lyt = 0.0;
const lzt = 0.0;

const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);

// Texture map
// indices: 0=stars, 1=sun, 2=mercury, 3=venus_surface, 4=venus_atmo,
//          5=earth, 6=mars, 7=jupiter, 8=saturn, 9=uranus, 10=neptune, 11=moon
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

const TEXTURE_KEYS = ["stars","sun","mercury","venus_surface","venus_atmo",
                      "earth","mars","jupiter","saturn","uranus","neptune","moon"];

// Orbital periods relative to Earth = 1.0 (real ratios)
// Speed = 1/period so Mercury is fastest
const PLANETS = [
  // name,         tex_idx, size,  orbit_r, speed,        self_rot, shading
  { name:"mercury", tex:2,  sz:0.06, r:0.22, spd:4.147,  rot:0, shade:1 },
  { name:"venus",   tex:3,  sz:0.09, r:0.30, spd:1.626,  rot:0, shade:1 },
  { name:"earth",   tex:5,  sz:0.10, r:0.42, spd:1.0,    rot:0, shade:1 },
  { name:"mars",    tex:6,  sz:0.07, r:0.54, spd:0.531,  rot:0, shade:1 },
  { name:"jupiter", tex:7,  sz:0.22, r:0.72, spd:0.084,  rot:0, shade:1 },
  { name:"saturn",  tex:8,  sz:0.19, r:0.88, spd:0.034,  rot:0, shade:1 },
  { name:"uranus",  tex:9,  sz:0.14, r:1.02, spd:0.012,  rot:0, shade:1 },
  { name:"neptune", tex:10, sz:0.13, r:1.15, spd:0.006,  rot:0, shade:1 },
];

// Moon data
const MOON = { tex:11, sz:0.03, orbit_r:0.08, spd:13.37, rot:0 };

// Orbit accumulators (in degrees)
let planet_angles = new Array(PLANETS.length).fill(0);
let moon_angle = 0;
let sun_rot = 0;
let stars_rot = 0;

// Camera controls
let orbit_speed_crd = 3;
let orbit_radius_crd = 1.0;
let orbit_angle_crd = 0;

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
      let v_coord = phi / Math.PI;
      texCoord_data.push(vec2(u, v_coord));
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
      webgl_context.texParameteri(webgl_context.TEXTURE_2D, webgl_context.TEXTURE_MIN_FILTER,
        webgl_context.LINEAR_MIPMAP_LINEAR);
      webgl_context.texParameteri(webgl_context.TEXTURE_2D, webgl_context.TEXTURE_MAG_FILTER,
        webgl_context.LINEAR);
      webgl_context.texParameteri(webgl_context.TEXTURE_2D, webgl_context.TEXTURE_WRAP_S,
        webgl_context.CLAMP_TO_EDGE);
      webgl_context.texParameteri(webgl_context.TEXTURE_2D, webgl_context.TEXTURE_WRAP_T,
        webgl_context.CLAMP_TO_EDGE);
      webgl_context.bindTexture(webgl_context.TEXTURE_2D, null);
    };
    image.crossOrigin = "anonymous";
    image.src = url_map.get(name);
    textures[index] = texture;
  });
}

function allocateMemory() {
  let vertex_buffer = webgl_context.createBuffer();
  webgl_context.bindBuffer(webgl_context.ARRAY_BUFFER, vertex_buffer);
  webgl_context.bufferData(webgl_context.ARRAY_BUFFER, flatten(vertex_data), webgl_context.STATIC_DRAW);
  webgl_context.vertexAttribPointer(attr_vertex, size, webgl_context.FLOAT, false, 0, 0);
  webgl_context.enableVertexAttribArray(attr_vertex);

  let normal_buffer = webgl_context.createBuffer();
  webgl_context.bindBuffer(webgl_context.ARRAY_BUFFER, normal_buffer);
  webgl_context.bufferData(webgl_context.ARRAY_BUFFER, flatten(normal_data), webgl_context.STATIC_DRAW);
  webgl_context.vertexAttribPointer(attr_normal, size, webgl_context.FLOAT, false, 0, 0);
  webgl_context.enableVertexAttribArray(attr_normal);

  let texCoord_buffer = webgl_context.createBuffer();
  webgl_context.bindBuffer(webgl_context.ARRAY_BUFFER, texCoord_buffer);
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
  bindTexture(texIndex, texIndex);
  webgl_context.uniform1i(uniform_shading_enabled, shading);
  webgl_context.uniform1f(uniform_alpha, alpha);
  webgl_context.uniform4f(uniform_trans, tx, ty, tz, 1.0);
  webgl_context.uniform4f(uniform_props, 0.0, rotY, 0.0, scale);
  webgl_context.drawArrays(webgl_context.TRIANGLES, 0, vertex_data.length);
}

function draw() {
  webgl_context.clear(webgl_context.DEPTH_BUFFER_BIT | webgl_context.COLOR_BUFFER_BIT);

  let eye = vec3(xt, yt, zt);
  let Vm = lookAt(eye, at, up);
  let P  = perspective(fov, canvas.width / canvas.height, 0.1, 100.0);

  webgl_context.uniformMatrix4fv(uniform_view, false, flatten(Vm));
  webgl_context.uniformMatrix4fv(uniform_perspective, false, flatten(P));
  webgl_context.uniform3f(uniform_eye, xt, yt, zt);
  webgl_context.uniform4fv(uniform_light, vec4(lxt, lyt, lzt, 0.0));

  // Skybox — huge sphere, no shading, barely rotating
  stars_rot = (stars_rot + 0.01) % 360;
  drawSphere(0, 0, 0, 50.0, radians(stars_rot), 0, 0, 1.0);

  // Sun
  sun_rot = (sun_rot + 0.5) % 360;
  drawSphere(0, 0, 0, 0.35, radians(sun_rot), 1, 0, 1.0);

  // Planets
  const base_speed = 0.8;
  let earth_x = 0, earth_z = 0;

  for (let i = 0; i < PLANETS.length; i++) {
    const p = PLANETS[i];
    planet_angles[i] = (planet_angles[i] + base_speed * p.spd) % 360;
    p.rot = (p.rot + 3) % 360;

    const theta = radians(planet_angles[i]);
    const px = p.r * Math.cos(theta);
    const py = 0.0;
    const pz = p.r * Math.sin(theta);

    if (p.name === "earth") {
      earth_x = px;
      earth_z = pz;
      document.getElementById("live-angle").textContent = theta.toFixed(2) + " rad";
      document.getElementById("live-x").textContent = px.toFixed(2);
      document.getElementById("live-z").textContent = pz.toFixed(2);
    }

    drawSphere(px, py, pz, p.sz, radians(p.rot), p.tex, p.shade, 1.0);

    // Venus atmosphere second pass
    if (p.name === "venus") {
      drawSphere(px, py, pz, p.sz * 1.05, radians(p.rot * 0.7), 4, 0, 0.4);
    }
  }

  // Moon orbiting Earth
  moon_angle = (moon_angle + base_speed * MOON.spd) % 360;
  MOON.rot = (MOON.rot + 5) % 360;
  const mt = radians(moon_angle);
  const mx = earth_x + MOON.orbit_r * Math.cos(mt);
  const mz = earth_z + MOON.orbit_r * Math.sin(mt);
  drawSphere(mx, 0, mz, MOON.sz, radians(MOON.rot), 11, 1, 1.0);
}

// Reset buttons
document.getElementById("reset_cl").addEventListener("click", function() {
  xt = 0.0; yt = 0.0; zt = 1.0; fov = 85;
  document.getElementById("xt").value = xt;
  document.getElementById("x_crd").innerHTML = "0.00";
  document.getElementById("yt").value = yt;
  document.getElementById("y_crd").innerHTML = "0.00";
  document.getElementById("zt").value = zt;
  document.getElementById("z_crd").innerHTML = "1.00";
  document.getElementById("fov").value = fov;
  document.getElementById("fovy").innerHTML = "85°";
});

document.getElementById("reset_ss").addEventListener("click", function() {
  orbit_speed_crd = 3.0;
  orbit_radius_crd = 1.0;
  orbit_angle_crd = 0;
  document.getElementById("os").value = orbit_speed_crd;
  document.getElementById("os_crd").innerHTML = "3.0";
  document.getElementById("od").value = orbit_radius_crd;
  document.getElementById("od_crd").innerHTML = "1.0";
  document.getElementById("oa").value = orbit_angle_crd;
  document.getElementById("oa_crd").innerHTML = "0°";
});

createVertexData();
createNormalData();
createTexCoordData();
configure();
loadTextures();
allocateMemory();
setInterval(draw, 33);