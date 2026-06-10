// Camera lerp
let lerp_start = null;
let lerp_from = null;
let lerp_to = null;
let lerp_duration = 2000;
let cam_lerping = false;
let cam_lerp_done_cb = null;
let tracking_active = false;

// ============================================================
// Camera lerp with ease-in-out cubic
// ============================================================

// Spherical coords — synced from xt/yt/zt
let cam_theta = 0;
let cam_phi = 0.3;
let cam_radius = 1.0;
let is_dragging = false;
let drag_start = { x: 0, y: 0 };
let drag_moved = false;

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

function flyToPlanetSolar(index) {
  const p = PLANET_DATA[index];
  const { tx, ty, tz } = cameraFor(index);
  fov = index === 7 ? 95 : index >= 5 ? 85 : 60; // Saturn, Uranus, Nepture get wider view

  view_mode = 'solar';
  document.getElementById('btn-solar').classList.add('active');
  document.getElementById('btn-system').classList.remove('active');
  document.getElementById('btn-orrery').classList.remove('active');

  tracking_active = false; // pause tracking during lerp
  flyToPosition(tx, ty, tz, 2000, () => {
    tracking_active = true; // kick in after lerp lands
  });
}

// ============================================================
// View toggle
// ============================================================
function setView(mode, animate = true) {
  view_mode = mode;
  const btn = id => document.getElementById('btn-' + id);
  ['solar', 'system', 'orrery'].forEach(m => btn(m).classList.toggle('active', m === mode));

  if (mode === 'solar') {
    tracking_active = false;
    flyToPlanetSolar(selected_planet);
  } else {
    tracking_active = false;
    const v = VIEWS[mode];
    fov = v.fov;
    if (animate) flyToPosition(v.x, v.y, v.z, 2000);
    else { 
      xt = v.x;
      yt = v.y;
      zt = v.z;
    }
  }
}

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