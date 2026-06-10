const PLANET_DATA = [
  { name:"Mercury", sub:"first planet · sol system",   color:"#b5b5b5", period:"88 Earth days",       distance:"0.39 AU",  diameter:"4,879 km",   moons:"0",   desc:"Smallest planet. Extreme temperature swings from -180°C to 430°C.",                            tex:2,  sz:0.06, r:0.22, spd:4.147, rot:0, shade:1 },
  { name:"Venus",   sub:"second planet · sol system",  color:"#e8c97a", period:"225 Earth days",      distance:"0.72 AU",  diameter:"12,104 km",  moons:"0",   desc:"Hottest planet at 465°C average. Thick CO₂ atmosphere with sulfuric acid clouds.",            tex:3,  sz:0.09, r:0.30, spd:1.626, rot:0, shade:1 },
  { name:"Earth",   sub:"third planet · sol system",   color:"#2d7dd2", period:"365.25 Earth days",   distance:"1.00 AU",  diameter:"12,742 km",  moons:"1",   desc:"Only known planet with life. 71% of surface covered by liquid water.",                       tex:5,  sz:0.10, r:0.42, spd:1.0,   rot:0, shade:1 },
  { name:"Mars",    sub:"fourth planet · sol system",  color:"#c1440e", period:"687 Earth days",      distance:"1.52 AU",  diameter:"6,779 km",   moons:"2",   desc:"Home to Olympus Mons, the largest volcano in the solar system at 22km tall.",                tex:6,  sz:0.07, r:0.54, spd:0.531, rot:0, shade:1 },
  { name:"Jupiter", sub:"fifth planet · sol system",   color:"#c88b3a", period:"11.86 Earth years",   distance:"5.20 AU",  diameter:"139,820 km", moons:"95",  desc:"Largest planet. The Great Red Spot is a storm that has raged for over 350 years.",          tex:7,  sz:0.22, r:0.72, spd:0.084, rot:0, shade:1 },
  { name:"Saturn",  sub:"sixth planet · sol system",   color:"#e4d191", period:"29.46 Earth years",   distance:"9.58 AU",  diameter:"116,460 km", moons:"146", desc:"Least dense planet — it would float on water. Rings made of ice and rock.",                  tex:8,  sz:0.19, r:0.88, spd:0.034, rot:0, shade:1 },
  { name:"Uranus",  sub:"seventh planet · sol system", color:"#7de8e8", period:"84 Earth years",      distance:"19.2 AU",  diameter:"50,724 km",  moons:"28",  desc:"Rotates on its side at 98° tilt. Coldest planetary atmosphere at -224°C.",                  tex:9,  sz:0.14, r:1.02, spd:0.012, rot:0, shade:1 },
  { name:"Neptune", sub:"eighth planet · sol system",  color:"#3f54ba", period:"164.8 Earth years",   distance:"30.05 AU", diameter:"49,244 km",  moons:"16",  desc:"Strongest winds in the solar system at 2,100 km/h. Has a storm called the Great Dark Spot.", tex:10, sz:0.13, r:1.15, spd:0.006, rot:0, shade:1 },
];

const MOON = { tex:11, sz:0.03, orbit_r:0.08, spd:13.37, rot:0 };

function cameraFor(index) {
  const p = PLANET_DATA[index];
  const positions = (use_real_positions && typeof getRealPlanetPositions === "function")
    ? getRealPlanetPositions(sim_date)
    : planet_positions;
  const pos = positions[index];

  const len = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
  const nx = len > 0 ? pos.x / len : 0;
  const nz = len > 0 ? pos.z / len : 1;

  const dist = Math.max(p.sz * 3, 0.18 + p.r * 0.25);
  const ty = p.r < 0.5 ? Math.max(0.08, p.r * 0.2) : Math.max(0.5, p.r * 0.35);

  return {
    tx: pos.x + nx * dist,
    ty,
    tz: pos.z + nz * dist 
  };
}

function selectPlanet(index, flyTo) {
  selected_planet = index;
  updateInfoCard(index);
  updatePlanetSymbols(index);
  pulseInfoCard(index);
  if (flyTo && view_mode === 'solar') flyToPlanetSolar(index);
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
  document.getElementById("live-section").style.display = p.name === "Earth" ? "block" : "none";
}

function updatePlanetSymbols(index) {
  document.querySelectorAll('.planet-sym').forEach((el, i) => {
    el.classList.toggle('active', i === index);
  });
}

function pulseInfoCard(index) {
  const card = document.getElementById('info-card');
  const color = PLANET_DATA[index].color;
  card.style.borderColor = color;
  setTimeout(() => { card.style.borderColor = ''; }, 400);
}

// ============================================================
// Planet symbol bar
// ============================================================
function setupPlanetSymbols() {
  document.querySelectorAll('.planet-sym').forEach(el => {
    el.addEventListener('click', function() {
      selectPlanet(parseInt(this.dataset.index), true);
    });
  });
}