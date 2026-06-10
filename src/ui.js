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