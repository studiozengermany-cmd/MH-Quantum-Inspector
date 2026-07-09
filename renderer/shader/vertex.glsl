// MH-Quantum Vertex Shader
attribute vec3 a_position;
attribute float a_alpha;

uniform mat4 u_matrix;
uniform float u_time;
uniform float u_z_depth;

varying float v_alpha;
varying float v_z_depth;

void main() {
  // Pulse effect theo time
  float pulse = sin(u_time * 2.0 + a_position.x * 0.05) * 0.5 + 0.5;

  vec3 pos = a_position;
  // Z-depth shift nhẹ để tạo cảm giác "thở"
  pos.z += sin(u_time * 1.5 + a_position.y * 0.03) * u_z_depth * 2.0;

  gl_Position = u_matrix * vec4(pos, 1.0);
  gl_PointSize = 3.0;

  v_alpha    = a_alpha * (0.7 + pulse * 0.3);
  v_z_depth  = u_z_depth;
}
