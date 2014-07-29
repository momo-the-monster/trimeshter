var mmm = mmm || {};

var FiddlyBits = mmm.FiddlyBits = function FiddlyBits(canvas) {

    var camera = {};               // Three.js scene objects
    var renderer = {};
    var projector = {};
    var scene = {};
    var canvas = canvas;
    var materials = [];            // Currently selected material array
    var config = {};
    var layer = {};
    var layerFilledBoxes = {};
    var boxSize = 64;
    var cols, rows;
    var filledBoxes = {};
    var cursors = {};
    var touchToBox = {};
    var materialsSolid = [];
    var materialsWire = [];

    // FiddlyBits is self-initializing!
    init();

    /**
     * Calls all init modules
     */
    function init() {
        config = initConfig();
    //    initGui();
        initThree();
        initMaterials();
        animate();
    }

    /**
     * Setup custom config settings
     * These are all adjustable from dat.GUI
     */
    function initConfig() {
        return {
            boxSize: 64,
            fadeWait: 3,
            palette: 0,
            outline: {
                fade: 5
            }
        }
    }

    /**
     * Set up Dat.GUI controls
     */
    function initGui() {
        var gui = new dat.GUI();

        gui.remember(config);

   //     var guiBuild = gui.addFolder("Building");
   //     guiBuild.add(config, 'mirror');
   //     guiBuild.open();

        return gui;
    }

    /**
     * Set up THREE.js scene
     */
    function initThree() {
        renderer = new THREE.CanvasRenderer({canvas: canvas});

        renderer.setSize(window.innerWidth, window.innerHeight);
        var width = window.innerWidth;
        var height = window.innerHeight;

       camera = new THREE.OrthographicCamera( width / - 2, width / 2, height / 2, height / - 2, -500, 1000 );
//        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 10000);
        projector = new THREE.Projector();
        camera.position.z = 1000;

        cols = Math.ceil( window.innerWidth / boxSize );
        rows = Math.ceil( window.innerHeight / boxSize );

        // THREEx plugins
        THREEx.WindowResize(renderer, camera);

        scene = new THREE.Scene();

        layer = new THREE.Object3D();
        scene.add(layer);

        layerFilledBoxes = new THREE.Object3D();
        layerFilledBoxes.position.z = 0.01;
        scene.add(layerFilledBoxes);


    }

    /**
     * Create materials array to use
     * There are several palettes to choose from
     * And we generate a solid and wireframe array of our chosen palette
     */
    function initMaterials() {
        // Spring Palette from http://www.colourlovers.com/palette/3365617/spring
        var springPalette = [
            [45, 59, 96],
            [248, 99, 99],
            [255, 255, 255],
            [176, 243, 176],
            [169, 249, 245]
        ];

        // BlacknBlue from http://www.colourlovers.com/palette/3370153/blacknblue
        var blacknblue = [
            [68, 68, 68],
            [8, 226, 255],
            [14, 96, 107],
            [230, 230, 230],
            [163, 172, 173]
        ];

        // Custom mix
        var pl1 = [
            [68, 68, 68],
            [8, 226, 255],
            [14, 96, 107],
            [230, 230, 230],
            [163, 172, 173],
            [250, 2, 60],
            [255, 0, 170],
            [92, 240, 212]
        ];

        var lsd = [
            [65,255,245],
            [62,192,197],
            [59,129,150],
            [56,65,102],
            [248,5,96],
        ];

        materialsSolid = buildMaterials(lsd, false);
        materialsWire = buildMaterials(lsd, true);
    }

    /**
     * Render Scene
     * Call requestAnimationFrame(self)
     */
    function animate(time) {

        for(var c in layer.children){
            var child = layer.children[c];
            child.scale.x += 0.03;
            child.scale.y += 0.03;
            child.scale.z += 0.03;
            child.material.color.r -= 0.01;
            child.material.color.g -= 0.01;
            child.material.color.b -= 0.01;

            if(child.scale.x > 40){
                layer.remove(child);
            }

        }

        for(var c in layerFilledBoxes.children){
            var child = layerFilledBoxes.children[c];
            if(child.userData['shrinking'] == true){
                child.scale.x -= 0.01;
                child.scale.y -= 0.01;

                if(child.scale.x < 0.01){
                    layerFilledBoxes.remove(child);
                }
            }

        }

        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    }

    function addGrowBox(position){
        var boxSizeHalf = boxSize / 2;
        var geometry = new THREE.Geometry();
        geometry.vertices.push(
            new THREE.Vector3(-boxSizeHalf,  boxSizeHalf, 0),
            new THREE.Vector3( boxSizeHalf,  boxSizeHalf, 0),
            new THREE.Vector3( boxSizeHalf, -boxSizeHalf, 0),
            new THREE.Vector3(-boxSizeHalf, -boxSizeHalf, 0),
            new THREE.Vector3(-boxSizeHalf,  boxSizeHalf, 0)
        );
        var material = getRandomMaterial(false).clone();
        var line = new THREE.Line(geometry, material, THREE.LineStrip);
        layer.add(line);
        line.position.set(position.x, position.y, position.z);
    }

    function showFilledBox(position){

        var info = getPointInfo(position);

        var geometry = new THREE.BoxGeometry(boxSize, boxSize, 0);
        var material = getRandomMaterial().clone();
        var mesh = new THREE.Mesh(geometry, material);
        mesh.userData['shrinking'] = false;
        layerFilledBoxes.add(mesh);
        var halfWidth = boxSize / 2;
        mesh.position.set(info.x + halfWidth, info.y + halfWidth, position.z);
        filledBoxes[info.index] = mesh;
    }

    function shrinkBoxAt(index){
        var targetBox = filledBoxes[index];
        if(targetBox != null){
            targetBox.userData['shrinking'] = true;
        }
    }

    function getPointInfo(position){
        var info = {};
        info.col = Math.floor(position.x / boxSize);
        info.row = Math.floor(position.y / boxSize);
        info.index = info.row * cols + info.col;
        info.x = info.col * boxSize;
        info.y = info.row * boxSize;
        return info;
    }

    /**
     * Main hook for Inputs
     * Adds new selection mesh
     * @param event has x, y, id
     */
    function onStart(event) {

        var position = getWorldPosition(event.x, event.y);
        if (position) {

            addGrowBox(position);
            showFilledBox(position);

            info = getPointInfo(position);

            touchToBox[event.id] = info.cell;
            cursors[event.id] = {x:event.x, y:event.y, cell:info.index};

        }

    }

    /**
     * Main hook for Inputs
     * @param event has x, y, id
     */
    function onMove(event) {

        var position = getWorldPosition(event.x, event.y);
        if (position) {
            var info = getPointInfo(position);
            var touchPreviousBox = touchToBox[event.id];

            var cursor = cursors[event.id];
            if(touchPreviousBox != info.index){
                showFilledBox(position);
                addGrowBox(position);
                shrinkBoxAt(info.index);
                touchToBox[event.id] = info.cell;
                cursors[event.id] = {x:event.x, y:event.y, cell:info.index};
            }
        }

    }

    /**
     * Main hook for Inputs
     * @param event
     */
    function onEnd(event) {

        var position = getWorldPosition(event.x, event.y);
        if (position) {
            shrinkBoxAt(getPointInfo(position).index);
        }
    }

    /**
     * Finds the world position from x&y screen positions
     * @param x
     * @param y
     * @returns {*}
     */
    function getWorldPosition(x, y) {

        var vector = new THREE.Vector3( x  * 2 - 1, -y * 2 + 1, 1 );
        projector.unprojectVector( vector, camera );
        var dir = vector.sub( camera.position ).normalize();
        var distance = - camera.position.z / dir.z;
        var pos = camera.position.clone().add( dir.multiplyScalar( distance ) );
        return pos;
    }

    /**
     * Sorts an array by one of its keys
     * TODO: make this an array prototype method? Maybe an mmm utils class?
     * @param array
     * @param key
     * @returns sorted {Array}
     */
    function sortByKey(array, key) {
        return array.sort(function (a, b) {
            var x = a[key];
            var y = b[key];
            return ((x < y) ? -1 : ((x > y) ? 1 : 0));
        });
    }

    /**
     * Returns a random number between min and max
     * @param min
     * @param max
     * @returns {*}
     */
    function getRandomArbitrary(min, max) {
        return Math.random() * (max - min) + min;
    }

    /**
     * Generate materials from color palette
     * @param palette
     * @param wireframe
     * @returns {Array}
     */
    function buildMaterials(palette, wireframe) {

        var result = [];
        var width = 256;
        var height = 256;

        for (var i in palette) {
            var color = palette[i];

            if(wireframe){
                result.push(
                    new THREE.LineBasicMaterial({color:"rgb(" + color[0] + "," + color[1] + "," + color[2] + ")", linewidth:1})
                )
            } else {

                // Prepare off-screen canvas
                var bitmap = document.createElement('canvas');
                var ctx = bitmap.getContext('2d');
                bitmap.width = 256;
                bitmap.height = 256;

                // Draw Gradient
                var grd = ctx.createLinearGradient(0, 0, 0, height);  //x0, y0, x1, y1
                grd.addColorStop(0, 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',0)');
                grd.addColorStop(1, 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',1)');

                ctx.fillStyle = grd;
                ctx.fillRect(0, 0, width, height);

                var texture = new THREE.Texture(bitmap);
                texture.needsUpdate = true;

                // Push generated texture into array as Material
                result.push(
                    new THREE.MeshBasicMaterial({
                        transparent: true,
                        map: texture,
                        side: THREE.DoubleSide
                    })
                );
            }
        }



        return result;
    }

    function getRandomMaterial(solid) {
        if(typeof(solid)==='undefined') solid = true;

        if(solid){
            return materialsSolid[ Math.floor(Math.random() * materialsSolid.length)];
        } else {
            return materialsWire[ Math.floor(Math.random() * materialsWire.length)];
        }
    }

    /**
     * Return some public properties
     */
    return {
        onStart: onStart,
        onMove: onMove,
        onEnd: onEnd,
        config: config,
        three: {
            renderer: renderer,
            scene: scene,
            camera: camera
        }
    }

};