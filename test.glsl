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
    vec2 st = gl_FragCoord.xy/u_resolution.xy;
    vec3 color = vec3(0.0);

    // // bottom-left
    // //vec2 bl = step(vec2(0.05),st);
    // vec2 bl = smoothstep(0.05, 0.1, st);
    // //vec2 bl = vec2(floor(st-0.9));
    // float pct = bl.x * bl.y;

    // // top-right
    // //vec2 tr = step(vec2(0.05),1.0-st);
    // vec2 tr = smoothstep(0.05, 0.1, 1.0-st);
    // //vec2 tr = vec2(floor(0.1-st));
    // pct *= tr.x * tr.y;

    color = DrawRecOutline(0.05, 0.5, st, vec3(0.9216, 0.9137, 0.9137))
    + DrawRecOutline(0.5, 0.7, st, vec3(0.6588, 0.0745, 0.0745));

    gl_FragColor = vec4(color,1.0);
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
