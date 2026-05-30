document.getElementById("xt").addEventListener("input", function(e) {
  if (cam_lerping) return;
  xt = parseFloat(e.target.value);
  document.getElementById("x_crd").textContent = xt.toFixed(2);
});

document.getElementById("yt").addEventListener("input", function(e) {
  if (cam_lerping) return;
  yt = parseFloat(e.target.value);
  document.getElementById("y_crd").textContent = yt.toFixed(2);
});

document.getElementById("zt").addEventListener("input", function(e) {
  if (cam_lerping) return;
  zt = parseFloat(e.target.value);
  document.getElementById("z_crd").textContent = zt.toFixed(2);
});

document.getElementById("fov").addEventListener("input", function(e) {
  fov = parseFloat(e.target.value);
  document.getElementById("fovy").textContent = fov + "°";
});

document.getElementById("os").addEventListener("input", function(e) {
  orbit_speed_crd = parseFloat(e.target.value);
  document.getElementById("os_crd").textContent = orbit_speed_crd.toFixed(1) + "x";
});
