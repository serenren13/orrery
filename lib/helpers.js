// ----------------------------------------------
// Helper functions used in previous assignments 
// that you and your team may use in your solution
// (do not modify).
// ----------------------------------------------

// ----------------------------------------------
// Function that flips the z-coordinate value.
//  - one argument that is vec3.
//  - returns a flipped vec3.
function flipz( v ) {
  let flip_z = vec3(v[0],v[1],-v[2]);
  return flip_z;
} // end flipz function

// ----------------------------------------------
// Function that centers the vertex values in 
// the vertex_data matrix at the origin or (0,0,0) 
// in our scene.
//  - no arguments
//  - no return value
function setVOriginToZero() {

  let tmp = [];

  let ave_x = 0;
  let ave_y = 0;
  let ave_z = 0;
  
  let tx, ty, tz = 0;

  for (let i = 0; i < vertex_data.length; i++) {
    ave_x = ave_x + vertex_data[i][0];
    ave_y = ave_y + vertex_data[i][1];
    ave_z = ave_z + vertex_data[i][2];
  }

  ave_x = ave_x / vertex_data.length;
  ave_y = ave_y / vertex_data.length;
  ave_z = ave_z / vertex_data.length;

  for (let i = 0; i < vertex_data.length; i++) {
    tx = vertex_data[i][0] - ave_x;
    ty = vertex_data[i][1] - ave_y;
    tz = vertex_data[i][2] - ave_z;
    tmp.push( [tx, ty, tz] );
  } 

  vertex_data = tmp;

} // end setVOriginToZero function

