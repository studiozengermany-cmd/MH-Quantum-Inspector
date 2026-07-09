// MH-Quantum Fragment Shader
precision mediump float;

uniform float u_time;
uniform float u_z_depth;

varying float v_alpha;
varying float v_z_depth;

void main() {
  // Màu shift từ #00FFAA → #FF00FF theo z-depth
  float t = clamp(v_z_depth / 10.0, 0.0, 1.0);

  vec3 color_shallow = vec3(0.0,  1.0,  0.667); // #00FFAA
  vec3 color_deep    = vec3(1.0,  0.0,  1.0);   // #FF00FF

  vec3 final_color = mix(color_shallow, color_deep, t);

  // Scanline flicker
  float flicker = 0.92 + 0.08 * sin(u_time * 8.0);

  gl_FragColor = vec4(final_color * flicker, v_alpha);
}
