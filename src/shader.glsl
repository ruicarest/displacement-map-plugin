//Define the precision
#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D u_image;              //Image texture
uniform sampler2D u_filter;             //Filter mask texture
uniform sampler2D u_mouseImage;         //Mouse filter mask texture
uniform vec2 u_mouse;                   //Mouse position
uniform vec2 u_resolution;              //canvas size
uniform vec2 u_displacement;            //Displacement magnitude (in x, in y)
uniform float u_time;                   //Time in seconds since load
uniform bool u_wrapPixelsAround;        //Flag multiply image on canvas
uniform vec2 u_imageSize;               //Image size (width, height)
uniform float u_imageScale;             //Image scale multiplier
uniform vec2 u_maskSize;                //Filter mask size (width, height)
uniform vec2 u_mouseFilterSize;         //Mouse filter mask size (width, height)
uniform int u_mapBehaviour;             //mapBehaviour
uniform bool u_hasMouseFilter;          //Flag has Mouse mask?
uniform float u_mouseImageScale;        //Mouse filter mask sclae multiplier

struct MapBehaviour
{
    int Tile;
    int Stretch;
    int Center;
};

const MapBehaviour mapBehaviour = MapBehaviour (1,2,3);

// All components are in the range [0…1], including hue.
vec3 rgb2hsv(vec3 c)
{
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

bool isInsideMouseArea() {

    vec2 distanceToMouse = gl_FragCoord.xy - u_mouse;

    if(abs(distanceToMouse.x) < u_mouseFilterSize.x/(2.0 * u_mouseImageScale) && abs(distanceToMouse.y) < u_mouseFilterSize.y/(2.0 * u_mouseImageScale)) {
        return true;
    }
    return false;
}

float CalcMouseLayerDist () {

    float brightnessMouse = 0.0;

    //if no filter available
    if(!u_hasMouseFilter) {
        return brightnessMouse;
    }

    if(isInsideMouseArea()) {

        vec2 distanceToMouse = gl_FragCoord.xy - u_mouse;

        //calc pixel coordinates to use
        vec2 pixelCoord = vec2 (0.5) + distanceToMouse/u_mouseFilterSize.xy*u_mouseImageScale;

        //find pixel color
        vec4 mouseColor = texture2D(u_mouseImage, pixelCoord, 1.0);

        //calc pixel brightness
        vec3 mouseHSV = rgb2hsv(vec3(mouseColor.r, mouseColor.g, mouseColor.b));

        brightnessMouse = mouseHSV.z - 0.5;
    }
    
    return brightnessMouse;
}

vec4 CalcMaskColor (vec2 screenUV) {

    vec4 maskColor;

    if(u_mapBehaviour == mapBehaviour.Tile) {
        vec2 maskUV = gl_FragCoord.xy / u_maskSize.xy;
        maskColor = texture2D(u_filter, fract(maskUV) , 1.0);
    }
    else if(u_mapBehaviour == mapBehaviour.Stretch) {
        maskColor = texture2D(u_filter,  screenUV, 1.0);
    }
    else if(u_mapBehaviour == mapBehaviour.Center) {
        vec2 maskUVoffSet = u_resolution.xy/2.0 - u_maskSize.xy/2.0;
        vec2 maskUV = (gl_FragCoord.xy - maskUVoffSet) / u_maskSize.xy;
        maskColor = texture2D(u_filter, maskUV , 1.0);
    }
    else {
        maskColor = texture2D(u_image,  screenUV*u_imageScale, 1.0);
    }

    return maskColor;
}

void main( void ) {

    vec4 maskColor;
    float mouseLayerDistortion;
    float brightness;
    vec3 maskHSV;
    vec2 screenUV, screenUVoffSet;
    vec2 texturePositionToUse;
    bool pixelOutsideImage;

    //center image offset
    screenUVoffSet = u_resolution.xy*u_imageScale/2.0 - u_imageSize.xy/2.0;

    //calc screenUV
    screenUV = (gl_FragCoord.xy * u_imageScale - screenUVoffSet ) / u_imageSize.xy;
    
    //distortion caused by mouse filter
    mouseLayerDistortion = CalcMouseLayerDist();

    //find pixel color mask depending on choosen behaviour
    maskColor = CalcMaskColor(screenUV);

    //convert mask color from RGB to HSV
    maskHSV = rgb2hsv(vec3(maskColor.r, maskColor.g, maskColor.b));

    brightness = 1.0 - maskHSV.z;

    //calculate pixel-to-mimic position
    texturePositionToUse =  screenUV 
                            + vec2(brightness-0.5)*u_displacement
                            + vec2(mouseLayerDistortion);

    pixelOutsideImage = texturePositionToUse.x > 1.0 || texturePositionToUse.x < 0.0 || texturePositionToUse.y > 1.0 ||  texturePositionToUse.y < 0.0;

    if(u_wrapPixelsAround || !pixelOutsideImage) {
        gl_FragColor =  texture2D(u_image, fract(texturePositionToUse));
    } else {
        //if pixel is outside original image, paint it black
        gl_FragColor = vec4(0.0);                
    }
}