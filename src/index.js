var shader = require('./fragmentShader.glsl');

//type: 1=mask, 2=image, 3=mouse
var loadTextureForUnifrom = (texture, uniform, type) => {
    return new THREE.TextureLoader().load(texture, function (texture) {
        uniform.value = texture;
        uniform.needsUpdate = true;
        texture.minFilter = THREE.NearestFilter;
        if (type == 2) {
            uniforms.u_imageSize.value = new THREE.Vector2(texture.image.width, texture.image.height);
        }
        else if (type == 1) {
            uniforms.u_maskSize.value = new THREE.Vector2(texture.image.width, texture.image.height);
        }
        else if(type == 3) {
            uniforms.u_mouseFilterSize.value = new THREE.Vector2(texture.image.width, texture.image.height);
        }
        else {
            //size is not needed
        }
    });
}
var EffectProperties = function () {
    this.MaxHorizontalDisplacement = 0.001;
    this.MaxVerticalDisplacement = 0.001;
    this.imageURL = "https://i.ibb.co/rQkhD97/0.jpg";
    this.DisplacementMapURL = "https://i.ibb.co/FJWXGCt/layer-v1.png";
    this.wrapPixelsAround = false;
    this.videoAsMask = false;
    this.videoAsImage = false;
    this.canvasWidth = 500;
    this.canvasHeight = 500;
    this.fitCanvasToImage = false;
    this.imageScale = 1.0;
    this.MapBehaviour = 2;
    //this.mouseImageURL ="https://i.ibb.co/PjCRwfv/77113.png";
    //this.mouseImageURL = "https://i.ibb.co/PYC0h8L/cenas.png";
    //this.mouseImageURL = "https://i.ibb.co/jM4P9qY/3d-illustration-grey-gradient-background-gradient-flat-cg1p63961144c-th.jpg";
    this.mouseImageURL = "https://i.ibb.co/g7tQ4wr/layer-v1.png";
    this.hasMouseFilter = true;
    this.mouseImageScale = 1.0;
};

//general vars
var container;
var videoElement, playPromise;
var videoPlaying = false;
var camera, scene, renderer;
var uniforms;
var effectProperties = new EffectProperties();
var gui = new dat.GUI();
var maskImage, gameImage, mouseImage;
//timeline related properties
var timeStampMap = new Map(); //map with all saved positions
var timelineState = 0; //0 -> hold | 1 -> play
var timePassed = 0;
//access DOM elements
var timeline = document.getElementById("timeline");
var timeMarker = document.getElementById("timeMarker");
var label = document.getElementById("label");
var savepoint = document.getElementById("savepoint");
var playImg = document.getElementById("play");
var currentTimeMarker = document.getElementById("currentTimeMarker");
//video related properties
var fps = 30;
var now;
var thenVideo = Date.now();
var thenTimeline = Date.now();
var intervalVideo = 1000 / fps;
var deltaVideo, deltaTimeline;
var intervalTimeline = 20;


init();
animate();

window.onload = function () {
    var shaderGUI = gui.addFolder('Shader');
    var videoGUI = gui.addFolder('Video');
    var canvasGUI = gui.addFolder('Canvas');
    var imageGUI = gui.addFolder('Image');
    var mouseGUI = gui.addFolder('Mouse');

    shaderGUI.open();
    canvasGUI.open();
    imageGUI.open();
    mouseGUI.open();

    shaderGUI.add(effectProperties, 'DisplacementMapURL').onChange(function (value) {
        maskImage = loadTextureForUnifrom(effectProperties.DisplacementMapURL, uniforms.u_filter, 1);
    });
    shaderGUI.add(effectProperties, 'imageURL').onChange(function (value) {
        gameImage = loadTextureForUnifrom(effectProperties.imageURL, uniforms.u_image, 2);
    });
    shaderGUI.add(effectProperties, 'MaxHorizontalDisplacement', -1.0, 1.0).listen();
    shaderGUI.add(effectProperties, 'MaxVerticalDisplacement', -1.0, 1.0).listen();
    shaderGUI.add(effectProperties, 'wrapPixelsAround').onChange((value) => {
        uniforms.u_wrapPixelsAround.value = value;
    });
    shaderGUI.add(effectProperties, 'MapBehaviour', { Tile: 1, Stretch: 2, Center: 3 })
        .onChange((value) => {
            uniforms.u_mapBehaviour.value = value;
        });

    mouseGUI.add(effectProperties, 'mouseImageURL').onChange(function (value) {
            mouseImage = loadTextureForUnifrom(value, uniforms.u_mouseImage, 3);
    });
    mouseGUI.add(effectProperties, 'hasMouseFilter', true).onChange((value) => {
        uniforms.u_hasMouseFilter.value = value;
    });

    mouseGUI.add(effectProperties, 'mouseImageScale',  0.0, 5.0).onChange((value) => {
        uniforms.u_mouseImageScale.value = 1.0 / value; //TODO remove value 
    });

    imageGUI.add(effectProperties, 'imageScale',  1.0, 5.0).onChange((value) => {
        uniforms.u_imageScale.value = 1.0 / value; //TODO remove value 
        if (effectProperties.fitCanvasToImage == true) {
            UpdateCanvasSize();
        }
    }).listen();

    var canvasWidthUI = canvasGUI
        .add(effectProperties, 'canvasWidth', 10.0, 3840.0)
        .listen()
        .onChange((value) => {
            UpdateCanvasSize();
        });

    var canvasHeightUI = canvasGUI
        .add(effectProperties, 'canvasHeight', 10.0, 2160.0)
        .listen().onChange((value) => {
            UpdateCanvasSize();
        });

    canvasGUI.add(effectProperties, 'fitCanvasToImage').onChange((checked) => {
        if (checked) {
            effectProperties.canvasHeight = gameImage.image.height;
            effectProperties.canvasWidth = gameImage.image.width;
            canvasHeightUI.domElement.style.pointerEvents = "none";
            canvasWidthUI.domElement.style.pointerEvents = "none";
            UpdateCanvasSize();
        }
        else {
            canvasHeightUI.domElement.style.pointerEvents = "auto";
            canvasWidthUI.domElement.style.pointerEvents = "auto";
        }
    });

    videoGUI.add(effectProperties, 'videoAsMask').onChange((value) => {
        if(value == false) {
            maskImage = loadTextureForUnifrom(effectProperties.DisplacementMapURL, uniforms.u_filter, 1);
        } else {
            videoPlaying = false;
        }
    });
    videoGUI.add(effectProperties, 'videoAsImage').onChange((value) => {
        if(value == false) {
            gameImage = loadTextureForUnifrom(effectProperties.imageURL, uniforms.u_image, 2);
        } else {
            videoPlaying = false;
        }
    });
};

document.onmousemove = function(e){
    uniforms.u_mouse.value.x = e.pageX;
    //canvas and glsl coordinates have different pivot points
    uniforms.u_mouse.value.y = uniforms.u_resolution.value.y - e.pageY;
}

function init() {
    container = document.getElementById('container');

    camera = new THREE.Camera();
    camera.position.z = 1;

    scene = new THREE.Scene();

    var geometry = new THREE.PlaneBufferGeometry(2, 2);

    uniforms = {
        u_time: { type: "1f", value: 0 },
        u_resolution: { type: 'v2', value: new THREE.Vector2() },
        u_displacement: { type: 'v2', value: new THREE.Vector2() },
        u_wrapPixelsAround: { type: 'bool', value: effectProperties.wrapPixelsAround },
        u_image: { type: 'sampler2D', value: null },
        u_filter: { type: 'sampler2D', value: null },
        u_mouseImage: {type:'sampler2D', value: null},
        u_imageSize: {type: 'v2', value: new THREE.Vector2()},
        u_imageScale: { type: "1f", value: 1.0 },
        u_maskSize: {type: 'v2', value: new THREE.Vector2()},
        u_mapBehaviour: {type: 'int', value: 2.0},
        u_mouse: {type: 'v2', value: new THREE.Vector2()},
        u_mouseFilterSize: {type: 'v2', value: new THREE.Vector2()},
        u_hasMouseFilter: {type: 'bool', value: effectProperties.hasMouseFilter},
        u_mouseImageScale: {type: "1f", value: 1.0 }
    };

    uniforms.u_displacement.value.x = 0.1;
    uniforms.u_displacement.value.y = 0.1;

    //https://codepen.io/Grooo/pen/dRXQPq -> vídeo example
    //cant load images locally  https://i.ibb.co/kGF0sMW/Untitled.png
    //var maskImage = new THREE.TextureLoader().load( "https://raw.githubusercontent.com/OmarShehata/Using-Displacement-Shaders-to-Create-an-Underwater-Effect/master/assets/mask.png" );            
    //HALF IMAGE
    //var maskImage = new THREE.TextureLoader().load( "https://i.ibb.co/kGF0sMW/Untitled.png" );
    //1/3 IMAGE  
    maskImage = loadTextureForUnifrom(effectProperties.DisplacementMapURL, uniforms.u_filter, 1);
    //ORIGINAL
    //var gameImage = new THREE.TextureLoader().load( "https://raw.githubusercontent.com/OmarShehata/Using-Displacement-Shaders-to-Create-an-Underwater-Effect/master/assets/game_screenshot.png" );
    //1ST USED IMAGE
    gameImage = loadTextureForUnifrom(effectProperties.imageURL, uniforms.u_image, 2);
    //gameImage = new THREE.TextureLoader().load( text.imageURL );
    //MAN IMAGE https://i.ibb.co/h1pZRzR/Capture.png
    //MOUSE IMAGE: https://i.ibb.co/B2Dbjch/77113.jpg
    mouseImage = loadTextureForUnifrom(effectProperties.mouseImageURL, uniforms.u_mouseImage,3);

    videoElement = document.getElementById('video');
    playPromise = videoElement.play();

    var material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        //vertexShader: document.getElementById( 'vertexShader' ).textContent, //vertex
        fragmentShader: shader //pixel
    });

    //testing purpose
    //var material = new THREE.MeshBasicMaterial ( { map: gameImage});

    var mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);

    container.appendChild(renderer.domElement);

    UpdateCanvasSize();

    initTimeLine();

}

function UpdateCanvasSize() {

    var scale = effectProperties.fitCanvasToImage ? effectProperties.imageScale : 1;

    if (effectProperties.fitCanvasToImage) {
        renderer.setSize(gameImage.image.width * scale, gameImage.image.height * scale);
    }
    else {
        renderer.setSize(effectProperties.canvasWidth, effectProperties.canvasHeight);
    }

    uniforms.u_resolution.value.x = effectProperties.canvasWidth * scale;
    uniforms.u_resolution.value.y = effectProperties.canvasHeight * scale;
}

function animate() {

    requestAnimationFrame( animate );

    now = Date.now();
    deltaVideo = now - thenVideo;
    deltaTimeline = now - thenTimeline;

    if (playPromise !== undefined && !videoPlaying) {
        playPromise.then(function () {
            videoPlaying = true;
            videoElement.play();
            if (effectProperties.videoAsImage) {
                gameImage = new THREE.VideoTexture(videoElement);
            }
            if (effectProperties.videoAsMask) {
                maskImage = new THREE.VideoTexture(videoElement);
            }
        }).catch(function (error) {
            //TODO: add an UI to manual playing
            console.log("play not ready");
        });
    }

    if (deltaVideo > intervalVideo) {

        thenVideo = now - (deltaVideo % intervalVideo);
        
        if(videoPlaying) {
            if(effectProperties.videoAsImage) {
                uniforms.u_image.value = gameImage;
                uniforms.u_image.needsUpdate = true;
            }
            if(effectProperties.videoAsMask) {
                uniforms.u_filter.value = maskImage;
                uniforms.u_filter.needsUpdate = true;
            }
        }
    }

    render();

    if(deltaTimeline > intervalTimeline) { 
        thenTimeline = now - (deltaTimeline % intervalTimeline);
        renderTimeMarker();
    }
}

function render() {
    uniforms.u_displacement.value.x = effectProperties.MaxHorizontalDisplacement;
    uniforms.u_displacement.value.y = effectProperties.MaxVerticalDisplacement;
    uniforms.u_imageScale.value = 1/effectProperties.imageScale;
    uniforms.u_time.value += 0.05;
    renderer.render(scene, camera);
}

//current timelinePosition
var timelinePosition = 0;

//create new point
line.onmousedown = function (e) {
    timelinePosition = event.clientX;
    timeMarker.style.left = event.clientX+"px";
    UpdatePreviewShaderParamenters(timelinePosition);
};

//show time label
timeline.onmousemove = function (e) {
    label.hidden = false;
    label.style.left = e.clientX + "px";
    label.innerHTML = e.clientX;
}

//hide time label
timeline.onmouseleave = function (e) {
    label.hidden = true;
}

//clicking on "SAVE"
savepoint.onmousedown = function (e) {
    createNewPoint(timelinePosition);
}

//Create new point in timeline
function createNewPoint (width, isFirst = false) {
    //is there a point already created?
    if(document.getElementById(width)) {
        updateSettings(width);
        console.log("point updated");
        return;
    }
    //create new point div
    createTimeStampDiv(width, isFirst);
    //create new point data
    createTimeStampData(width);
    //sort time stamps from smaller to larger
    sortTimeStampMap();
}

//loadSetting on given point
function loadSettings (timeStamp) {
    var settings = timeStampMap.get(timeStamp);
    effectProperties.MaxHorizontalDisplacement = settings.displacementX;
    effectProperties.MaxVerticalDisplacement = settings.displacementY;
    effectProperties.imageScale = settings.imageScale;
}

//updateSettings on given point
function updateSettings (timeStamp) {
    createTimeStampData(timeStamp);
}

//remove time stamp
function removeTimeStampData (timeStamp) {
    timeStampMap.delete(timeStamp);
    timeStampMap.has(timeStamp);
}

//create timeStamp method
function createTimeStampData (timeStamp) {
    var timeStampData = {
        displacementX: effectProperties.MaxHorizontalDisplacement, 
        displacementY: effectProperties.MaxVerticalDisplacement,
        imageScale: effectProperties.imageScale
    }
    timeStampMap.set(timeStamp, timeStampData);
}

function createTimeStampDiv (width, isFirst) {
    var newDiv = document.createElement('div');
    newDiv.id = width;
    timeline.appendChild(newDiv);

    //set div style 
    newDiv.style.left = width+"px";
    newDiv.style.position = "absolute";
    newDiv.style.zIndex = 5;
    newDiv.style.cursor = "pointer";

    //star icon
    var pointImg = document.createElement('img');
    pointImg.setAttribute("src", "../images/star.png");
    pointImg.setAttribute("height", "15");
    pointImg.setAttribute("width", "15");

    //load settings on mouse down
    pointImg.onmousedown = () => {
        timelinePosition = width;
        timeMarker.style.left = width+"px";
        loadSettings(width);
    };

    newDiv.appendChild(pointImg);

    //do not create delete icon on first timeStamp
    if(!isFirst) {
        //delete icon
        var pointImgDel = document.createElement('img');
        pointImgDel.setAttribute("src", "../images/remove.png");
        pointImgDel.setAttribute("height", "15");
        pointImgDel.setAttribute("width", "15");
    
        //remove point on mouse down
        pointImgDel.onmousedown = () => {
            //remove data
            removeTimeStampData(width);
            //remove this div
            newDiv.parentNode.removeChild(newDiv);
        }

        newDiv.appendChild(pointImgDel);
    }

    return newDiv;
}

playImg.onmousedown = function (e) {
    if(timelineState == 0 ) {
        console.log("playing");
        timelineState = 1;
        playImg.setAttribute("src", "../images/pause.png");
        //reset timestamp values
        currentTimeStamp = 0;
        nextTimeStamp = 0;

    }
    else if (timelineState == 1 ) {
        console.log("pause");
        resetTimeLine();
    }
}

function initTimeLine () {
    createNewPoint(0, true);
    createNewPoint(1000);
}

function resetTimeLine() {
    timelineState = 0;
    playImg.setAttribute("src", "../images/play.png");
    //reset timeMarker
    timePassed = 0;
    currentTimeMarker.style.left = 0;
    currentTimeStamp = 0;
    nextTimeStamp = 0;
}

function renderTimeMarker () {
    if(timelineState == 1) {
        timePassed += 2;
        currentTimeMarker.style.left = timePassed+"px";
        UpdateRenderShaderParameters();
        //reached the end
        if(timePassed >= 1000) {
            //reset preview
            UpdatePreviewShaderParamenters (0);
            //reset time line bar
            resetTimeLine();
        }
    }
}

var currentTimeStamp = 0;
var nextTimeStamp = 0;

function UpdateRenderShaderParameters () {

    var isLastTimeStamp = false;

    if(nextTimeStamp <= timePassed) {
        currentTimeStamp = nextTimeStamp;
        nextTimeStamp = findNextTimeStamp();

        if(nextTimeStamp == 0) {
            //keep the same till the end
            nextTimeStamp = currentTimeStamp;
            isLastTimeStamp = true;
        }

        console.log(currentTimeStamp, nextTimeStamp);
    }
    if(!isLastTimeStamp) {
        UpdateShaderParameters(timePassed);
    }
}

function UpdatePreviewShaderParamenters (elapsedTime) {

    // put keys in Array
    var keys = [];
    timeStampMap.forEach((value, key, map) => {
        keys.push(key);
    });

    //find next and current timestamp
    for (let i = 0; i < keys.length; i++) {
        if (keys[i] > elapsedTime) {
            nextTimeStamp = keys[i];
            currentTimeStamp = keys[i-1];
            console.log(currentTimeStamp, nextTimeStamp);
            break;
        }
    }
    UpdateShaderParameters(elapsedTime);
}

function UpdateShaderParameters (elapsedTime) {

    var currentSet = timeStampMap.get(currentTimeStamp);
    var nextSet = timeStampMap.get(nextTimeStamp);

    effectProperties.MaxHorizontalDisplacement = currentSet.displacementX + (nextSet.displacementX - currentSet.displacementX) * (elapsedTime - currentTimeStamp) / (nextTimeStamp - currentTimeStamp);
    effectProperties.MaxVerticalDisplacement = currentSet.displacementY + (nextSet.displacementY - currentSet.displacementY) * (elapsedTime - currentTimeStamp) / (nextTimeStamp - currentTimeStamp);
    effectProperties.imageScale = currentSet.imageScale + (nextSet.imageScale - currentSet.imageScale) * (elapsedTime - currentTimeStamp) / (nextTimeStamp - currentTimeStamp);
}

function findNextTimeStamp () {
    var next = null;
    timeStampMap.forEach((value, key, map) => {
        if(key > currentTimeStamp && !next) {
            next = key;
        }
    })
    return next ? next : 0;
}

function sortTimeStampMap () {
    // Initialize your keys array
    var keys = [];
    // Initialize your sorted map object
    var sortedMap = new Map();
    // put keys in Array
    timeStampMap.forEach((value, key, map) => {
        keys.push(key);
    });
    //build the new sorted map object
    keys = keys.sort((a,b) => a -b).map(function(key) {
        sortedMap.set(key, timeStampMap.get(key));
    });
    timeStampMap = sortedMap;
}