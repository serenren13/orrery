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