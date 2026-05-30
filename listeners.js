// ----------------------------------------------
// Event listeners (do not modify)
// ----------------------------------------------

// listener for the orbit speed slider
document.getElementById("os").addEventListener("input", function (e) {
    orbit_speed_crd = parseFloat(document.getElementById("os").value);
    document.getElementById("os_crd").innerHTML = " = " + orbit_speed_crd;
});

// listener for the orbit distance slider
document.getElementById("od").addEventListener("input", function (e) {
    orbit_radius_crd = parseFloat(e.target.value);
    document.getElementById("od_crd").innerHTML = " = " + orbit_radius_crd;
});

// listener for the orbit angle slider
document.getElementById("oa").addEventListener("input", function (e) {
    orbit_angle_crd = parseFloat(document.getElementById("oa").value);
    document.getElementById("oa_crd").innerHTML = " = " + orbit_angle_crd;
});

// listener for the zt camera location slider
document.getElementById("zt").addEventListener( "input", function(e) {
  zt = document.getElementById("zt").value;
  document.getElementById("z_crd").innerHTML="= " + zt;
} );

// listener for the xt camera location slider
document.getElementById("xt").addEventListener( "input", function(e) {
  xt = document.getElementById("xt").value;
  document.getElementById("x_crd").innerHTML="= " + xt;
} );

// listener for the yt camera location slider
document.getElementById("yt").addEventListener( "input", function(e) {
  yt = document.getElementById("yt").value;
  document.getElementById("y_crd").innerHTML="= " + yt;
});

// listener for the zt camera location slider
document.getElementById("fov").addEventListener( "input", function(e) {
  fov = document.getElementById("fov").value;
  document.getElementById("fovy").innerHTML="= " + fov;
} );

// button listener to reset the camera control sliders
document.getElementById("reset_cl").addEventListener( "click", function(e) {
  xt = yt = 0.0;
  zt = 1.0;
  fov = 85;
  document.getElementById("xt").value = xt;
  document.getElementById("x_crd").innerHTML="= " + xt;
  document.getElementById("yt").value = yt;
  document.getElementById("y_crd").innerHTML="= " + yt;
  document.getElementById("zt").value = zt;
  document.getElementById("z_crd").innerHTML="= " + zt;
  document.getElementById("fov").value = fov;
  document.getElementById("fovy").innerHTML="= " + fov;
  
});

// button listener to reset the earth orbit control sliders
document.getElementById("reset_ss").addEventListener("click", function (e) {
    orbit_speed_crd = 3; 
    orbit_radius_crd = 1.0; 
    orbit_angle_crd = 0; 
    document.getElementById("os").value = orbit_speed_crd;
    document.getElementById("os_crd").innerHTML = " = " + orbit_speed_crd;
    document.getElementById("od").value = orbit_radius_crd;
    document.getElementById("od_crd").innerHTML = " = " + orbit_radius_crd;
    document.getElementById("oa").value = orbit_angle_crd;
    document.getElementById("oa_crd").innerHTML = " = " + orbit_angle_crd;
    draw();
});
