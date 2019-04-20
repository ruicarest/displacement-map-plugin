#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;  // Canvas size (width,height)
uniform vec2 u_mouse;       // mouse position in screen pixels
uniform float u_time;       // Time in seconds since load

void main() {

	// //gl_FragColor = vec4(1.0,0.0,1.0,1.0);
    // gl_FragColor = vec4(abs(sin(u_time))*0.5,abs(sin(u_time)),abs(sin(u_time)),1.0);
	vec2 st = gl_FragCoord.xy/u_resolution;
    float post = u_mouse.y / u_resolution.y;
    float post2 = u_mouse.x / u_resolution.x;
	//gl_FragColor = vec4(post,post2,0.0,1.0);

    gl_FragColor = vec4(abs(sin(u_time*post)),abs(sin(u_time*post2)),0.0,1.0);
}