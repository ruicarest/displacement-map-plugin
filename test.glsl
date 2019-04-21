#ifdef GL_ES
precision mediump float;
#endif

#define PI 3.14159265359

uniform vec2 u_resolution;  // Canvas size (width,height)
uniform vec2 u_mouse;       // mouse position in screen pixels
uniform float u_time;       // Time in seconds since load

float plot(vec2 st, float pct){
  return  smoothstep( pct-0.02, pct, st.y) -
          smoothstep( pct, pct+0.02, st.y);
}

void main() {

	vec3 c;
	float l;
    float z = u_time;

	for(int i=0;i<3;i++) {

        vec2 st = gl_FragCoord.xy/u_resolution;
        
        c[i] = sin(4.00*z)/-z + st.x * 0.5;
        c[i] *= 60.0;
        z+=.07;
		
        // vec2 uv;
        // vec2 st = gl_FragCoord.xy/u_resolution;
		
        // uv=st;
		
        // st-=.5;
		
        // st.x *= u_resolution.y/u_resolution.x;
		
        // z+=.07;
		
        // l=length(st);
		
        // uv += st / l*(sin(z)+1.)*abs(sin(l*9.-z*2.));
		
        // c[i]=.01/length(abs(mod(uv,1.)-.5));
	}

	gl_FragColor=vec4(c/l,u_time);

    // vec2 st = gl_FragCoord.xy/u_resolution;

    //float y = pow(st.x,5.0);
    //float y = step(0.5,st.x);
    //float y = smoothstep(0.1,0.9,st.x);
    // float y = smoothstep(0.2,0.5,st.x) - smoothstep(0.5,0.8,st.x);
    // vec3 color = vec3(y);

    // float pct = plot(st,y);
    // color = (1.0-pct)*color+pct*vec3(0.1569, 0.5922, 0.7255);

    // gl_FragColor = vec4(color,1.0);
}

//y = mod(x,0.5); // return x modulo of 0.5
//y = fract(x); // return only the fraction part of a number
//y = ceil(x);  // nearest integer that is greater than or equal to x
//y = floor(x); // nearest integer less than or equal to x
//y = sign(x);  // extract the sign of x
//y = abs(x);   // return the absolute value of x
//y = clamp(x,0.0,1.0); // constrain x to lie between 0.0 and 1.0
//y = min(0.0,x);   // return the lesser of x and 0.0
//y = max(0.0,x);   // return the greater of x and 0.0 
