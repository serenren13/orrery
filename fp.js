console.clear();

// ----------------------------------------------
// Todo: Create variables used by your solution
// ----------------------------------------------
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

// Model data arrays
let vertex_data = [];
let normal_data = [];
let texCoord_data = [];
let size = 3;

// Rotation angles
let sun_rot = 0;
let earth_rot = 0;
let moon_rot = 0;

// Texture objects
let textures = [];

// ----------------------------------------------
// Camera parameters
// ----------------------------------------------

let xt = 0.0;
let yt = 0.0;
let zt = 1.0;
let fov = 85;

// ----------------------------------------------
// Light parameters that are fixed (do not modify)
// ----------------------------------------------
const lxt = 0.0;
const lyt = 0.0;
const lzt = 0.0;

// ----------------------------------------------
// Camera orientation parameters (do not modify)
// ----------------------------------------------
const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);

// ----------------------------------------------
// Map data structure. The key is a string 
// that defines the name of the image (e.g., 
// sun, earth, and moon) and the associated value 
// is also a string that defines a URL.
// (do no modify)
// ----------------------------------------------

let url_map = new Map();

url_map.set("sun", "sun.jpg");
url_map.set("earth", "earth.jpg");
url_map.set("moon", "moon.jpg");

// ----------------------------------------------
// Earth orbit parameters
// ----------------------------------------------
let orbit_speed = 0;
let orbit_speed_crd = 3; 
let orbit_radius_crd = 1.0; 
let orbit_angle_crd = 0; 

// ----------------------------------------------
// Todo: You code the solution
// ----------------------------------------------

// ----------------------------------------------
// Configure webgl context
// ----------------------------------------------
function configure() {
  canvas = document.getElementById("webgl-canvas");
  
  webgl_context = canvas.getContext("webgl");
  program = initShaders(webgl_context, "vertex-shader", "fragment-shader");
  webgl_context.useProgram(program);
  
  webgl_context.viewport(0, 0, canvas.width, canvas.height);
  
  attr_vertex = webgl_context.getAttribLocation(program, "vertex");
  attr_normal = webgl_context.getAttribLocation(program, "normal");
  attr_texCoord = webgl_context.getAttribLocation(program, "texCoord");
  
  uniform_color = webgl_context.getUniformLocation(program, "color");
  uniform_view = webgl_context.getUniformLocation(program, "V");
  uniform_perspective = webgl_context.getUniformLocation(program, "P");
  uniform_light = webgl_context.getUniformLocation(program, "light");
  uniform_props = webgl_context.getUniformLocation(program, "props");
  uniform_trans = webgl_context.getUniformLocation(program, "trans");
  uniform_eye = webgl_context.getUniformLocation(program, "eye");
  uniform_textureSampler = webgl_context.getUniformLocation(program, "textureSampler");
  uniform_shading_enabled = webgl_context.getUniformLocation(program, "shading_enabled");
  
  webgl_context.enable(webgl_context.DEPTH_TEST);

}

// ----------------------------------------------
// Create vertex data
// ----------------------------------------------
function createVertexData() {
  vertex_data = [];
  
  for (let i = 0; i < F.length; i++) {
    vertex_data.push(V[F[i][0]]);
    vertex_data.push(V[F[i][1]]);
    vertex_data.push(V[F[i][2]]);
  }
}

// ----------------------------------------------
// Create normal data
// ----------------------------------------------
function createNormalData() {
  normal_data = [];
  
  for (let i = 0; i < F.length; i++) {
    normal_data.push(N[F[i][0]]);
    normal_data.push(N[F[i][1]]);
    normal_data.push(N[F[i][2]]);
  }
}

// ----------------------------------------------
// Create texture coordinate data
// ----------------------------------------------
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

// ----------------------------------------------
// Create and load textures
// ----------------------------------------------
function loadTextures() {
  const textureNames = ["sun", "earth", "moon"];
  
  textureNames.forEach((name, index) => {
    let texture = webgl_context.createTexture();
    let image = new Image();
    
    image.onload = function() {
      webgl_context.bindTexture(webgl_context.TEXTURE_2D, texture);
      
      webgl_context.pixelStorei(webgl_context.UNPACK_FLIP_Y_IMAGE, true);
      
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

// ----------------------------------------------
// Allocate memory and load data
// ----------------------------------------------
function allocateMemory() {
  // Vertex buffer
  let vertex_buffer = webgl_context.createBuffer();
  webgl_context.bindBuffer(webgl_context.ARRAY_BUFFER, vertex_buffer);
  webgl_context.bufferData(webgl_context.ARRAY_BUFFER, flatten(vertex_data), webgl_context.STATIC_DRAW);
  webgl_context.vertexAttribPointer(attr_vertex, size, webgl_context.FLOAT, false, 0, 0);
  webgl_context.enableVertexAttribArray(attr_vertex);
  
  // Normal buffer
  let normal_buffer = webgl_context.createBuffer();
  webgl_context.bindBuffer(webgl_context.ARRAY_BUFFER, normal_buffer);
  webgl_context.bufferData(webgl_context.ARRAY_BUFFER, flatten(normal_data), webgl_context.STATIC_DRAW);
  webgl_context.vertexAttribPointer(attr_normal, size, webgl_context.FLOAT, false, 0, 0);
  webgl_context.enableVertexAttribArray(attr_normal);
  
  // Texture coordinate buffer
  let texCoord_buffer = webgl_context.createBuffer();
  webgl_context.bindBuffer(webgl_context.ARRAY_BUFFER, texCoord_buffer);
  webgl_context.bufferData(webgl_context.ARRAY_BUFFER, flatten(texCoord_data), webgl_context.STATIC_DRAW);
  webgl_context.vertexAttribPointer(attr_texCoord, 2, webgl_context.FLOAT, false, 0, 0);
  webgl_context.enableVertexAttribArray(attr_texCoord);
}

// ----------------------------------------------
// Draw function
// ----------------------------------------------
function draw() {
  webgl_context.clear(webgl_context.DEPTH_BUFFER_BIT);
  
  let eye = vec3(xt, yt, zt);
  let V = lookAt(eye, at, up);
  let P = perspective(fov, 1.0, 0.1, 10.0);
  
  webgl_context.uniformMatrix4fv(uniform_view, false, flatten(V));
  webgl_context.uniformMatrix4fv(uniform_perspective, false, flatten(P));
  webgl_context.uniform3f(uniform_eye, xt, yt, zt);
  
  let light = vec4(lxt, lyt, lzt, 0.0);
  webgl_context.uniform4fv(uniform_light, light);
  
  sun_rot = (sun_rot + 1) % 360;
  
  webgl_context.activeTexture(webgl_context.TEXTURE0);
  webgl_context.bindTexture(webgl_context.TEXTURE_2D, textures[0]);
  webgl_context.uniform1i(uniform_textureSampler, 0);
  webgl_context.uniform1i(uniform_shading_enabled, 0);
  
  webgl_context.uniform4f(uniform_trans, 0.0, 0.0, 0.0, 1.0);
  webgl_context.uniform4f(uniform_props, 0.0, radians(sun_rot), 0.0, 2.5);
  
  webgl_context.drawArrays(webgl_context.TRIANGLES, 0, vertex_data.length);
  
  orbit_speed = (orbit_speed + orbit_speed_crd) % 360;
  
  let theta = radians(orbit_speed);
  let phi = radians(orbit_angle_crd);
  
  let scale_factor = 0.6; // Reduce the orbit distance
  let earth_x = scale_factor * orbit_radius_crd * Math.sin(theta) * Math.cos(phi);
  let earth_y = scale_factor * orbit_radius_crd * Math.sin(theta) * Math.sin(phi);
  let earth_z = scale_factor * orbit_radius_crd * Math.cos(theta);
  
  earth_rot = (earth_rot + 5) % 360;
  
  webgl_context.activeTexture(webgl_context.TEXTURE1);
  webgl_context.bindTexture(webgl_context.TEXTURE_2D, textures[1]);
  webgl_context.uniform1i(uniform_textureSampler, 1);
  webgl_context.uniform1i(uniform_shading_enabled, 1);
  
  webgl_context.uniform4f(uniform_trans, earth_x, earth_y, earth_z, 1.0);
  webgl_context.uniform4f(uniform_props, 0.0, radians(earth_rot), 0.0, 0.5); // Scale 0.5
  
  webgl_context.drawArrays(webgl_context.TRIANGLES, 0, vertex_data.length);
  
  let moon_radius = 0.1;
  let moon_theta = radians(orbit_speed * 3.0);
  let moon_phi = 0;
  
  let moon_x_rel = moon_radius * Math.sin(moon_theta) * Math.cos(moon_phi);
  let moon_y_rel = moon_radius * Math.sin(moon_theta) * Math.sin(moon_phi);
  let moon_z_rel = moon_radius * Math.cos(moon_theta);
  
  let moon_x = earth_x + moon_x_rel;
  let moon_y = earth_y + moon_y_rel;
  let moon_z = earth_z + moon_z_rel;
  
  moon_rot = (moon_rot + 10) % 360;
  
  webgl_context.activeTexture(webgl_context.TEXTURE2);
  webgl_context.bindTexture(webgl_context.TEXTURE_2D, textures[2]);
  webgl_context.uniform1i(uniform_textureSampler, 2);
  webgl_context.uniform1i(uniform_shading_enabled, 1);
  
  webgl_context.uniform4f(uniform_trans, moon_x, moon_y, moon_z, 1.0);
  webgl_context.uniform4f(uniform_props, 0.0, radians(moon_rot), 0.0, 0.25);
  
  webgl_context.drawArrays(webgl_context.TRIANGLES, 0, vertex_data.length);
}

// ----------------------------------------------
// Event listener for reset buttons
// ----------------------------------------------
document.getElementById("reset_cl").addEventListener("click", function() {
  xt = 0.0;
  yt = 0.0;
  zt = 1.0;
  fov = 85;
  
  document.getElementById("xt").value = xt;
  document.getElementById("x_crd").innerHTML = "= " + xt;
  document.getElementById("yt").value = yt;
  document.getElementById("y_crd").innerHTML = "= " + yt;
  document.getElementById("zt").value = zt;
  document.getElementById("z_crd").innerHTML = "= " + zt;
  document.getElementById("fov").value = fov;
  document.getElementById("fovy").innerHTML = "= " + fov;
});

document.getElementById("reset_ss").addEventListener("click", function() {
  orbit_speed_crd = 3.0;
  orbit_radius_crd = 1.0;
  orbit_angle_crd = 0;
  
  document.getElementById("os").value = orbit_speed_crd;
  document.getElementById("os_crd").innerHTML = " = " + orbit_speed_crd;
  document.getElementById("od").value = orbit_radius_crd;
  document.getElementById("od_crd").innerHTML = " = " + orbit_radius_crd;
  document.getElementById("oa").value = orbit_angle_crd;
  document.getElementById("oa_crd").innerHTML = " = " + orbit_angle_crd;
});

// ----------------------------------------------
// Initialize and run the WebGL application
// ----------------------------------------------

createVertexData();
createNormalData();
createTexCoordData();
configure();
loadTextures();
allocateMemory();
setInterval(draw, 100);