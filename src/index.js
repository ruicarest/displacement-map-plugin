        //type: 1=mask, 2=image
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

        var container;
        var videoElement, playPromise;
        var videoPlaying = false;
        var camera, scene, renderer;
        var uniforms;
        var effectProperties = new EffectProperties();
        var gui = new dat.GUI();
        var maskImage, gameImage, mouseImage;

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
            shaderGUI.add(effectProperties, 'MaxHorizontalDisplacement', -1.0, 1.0);
            shaderGUI.add(effectProperties, 'MaxVerticalDisplacement', -1.0, 1.0);
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
            });

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
                fragmentShader: document.getElementById('fragmentShader').textContent //pixel
            });

            //testing purpose
            //var material = new THREE.MeshBasicMaterial ( { map: gameImage});

            var mesh = new THREE.Mesh(geometry, material);
            scene.add(mesh);

            renderer = new THREE.WebGLRenderer();
            renderer.setPixelRatio(window.devicePixelRatio);

            container.appendChild(renderer.domElement);

            UpdateCanvasSize();
            //onWindowResize();
            //window.addEventListener( 'resize', onWindowResize, false );
        }

        //deprecated
        // function onWindowResize(event) {
        //     renderer.setSize(window.innerWidth, window.innerHeight);
        //     uniforms.u_resolution.value.x = renderer.domElement.width;
        //     uniforms.u_resolution.value.y = renderer.domElement.height;
        // }

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

        var fps = 30;
        var now;
        var then = Date.now();
        var interval = 1000 / fps;
        var delta;

        function animate() {

            requestAnimationFrame( animate );

            now = Date.now();
            delta = now - then;

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

            if (delta > interval) {
                //console.log("frame");
                then = now - (delta % interval);
                
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
        }

        function render() {
            uniforms.u_displacement.value.x = effectProperties.MaxHorizontalDisplacement;
            uniforms.u_displacement.value.y = effectProperties.MaxVerticalDisplacement;
            uniforms.u_time.value += 0.05;
            renderer.render(scene, camera);
        }

