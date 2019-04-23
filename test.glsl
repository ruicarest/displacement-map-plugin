#ifdef GL_ES
precision mediump float;
#endif

#define PI 3.14159265359
#define TWO_PI 6.28318530718

uniform vec2 u_resolution;  // Canvas size (width,height)
uniform vec2 u_mouse;       // mouse position in screen pixels
uniform float u_time;       // Time in seconds since load


vec2 drawRec( in float a, in float b, in vec2 st ){

vec2 outStep = smoothstep(a, b, st);

return outStep;

}

vec3 DrawRecOutline ( in float a, in float b, in vec2 st, in vec3 color ) {
    
    //SMOOTHSTEP
    //vec2 bl = smoothstep(a, b, st);
    //vec2 tr = smoothstep(a, b, 1.0-st);
    //STEP
    vec2 bl = step(vec2(a),st);
    vec2 tr = step(vec2(0.05),b-st);

    // vec2 tl = step(vec2(0.4), st);
    // + tl.x * tl.y

    return vec3(tr.x * tr.y * bl.x * bl.y ) * color;
}


void main(){
	vec2 st = gl_FragCoord.xy/u_resolution;
    float pct = 0.0;

    // a. The DISTANCE from the pixel to the center
    pct = distance(st,vec2(0.5));

    //TURN EVERyTHING ABOVE 0.5 WHITE and ....
    pct = step(0.2, pct);
    
    // // b. The LENGTH of the vector
    // //    from the pixel to the center
    // vec2 toCenter = vec2(0.5)-st;
    // pct = length(toCenter);

    // // c. The SQUARE ROOT of the vector
    // //    from the pixel to the center
    // vec2 tC = vec2(0.5)-st;
    // pct = sqrt(tC.x*tC.x+tC.y*tC.y);

    //INVERT COLORS
    vec3 color = vec3(1.0-pct*2.0);

	gl_FragColor = vec4( color, 1.0 );
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
