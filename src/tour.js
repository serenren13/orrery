// Grand tour
let grand_tour_active = false;
let grand_tour_index = 0;
let grand_tour_timer = null;
let _tour_prev_time_mode = 'simulated';
let _tour_prev_real_positions = false;

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