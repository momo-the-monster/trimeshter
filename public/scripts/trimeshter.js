var mmm = mmm || {};
mmm.Trimeshter = mmm.Trimeshter || {};

var Trimeshter = mmm.Trimeshter = function Trimeshter(canvas) {

    // I declare all the member variables here for clarity
    // This is probably unnecessary
    this.wall = {};                 // Touch points intersect the wall to find scene positions
    this.allMeshes = [];            // Generated mesh items stored here
    this.selectionMeshes = [];      // In-progress selection meshes
    this.geoTri = {};               // Master object used to create new meshes
    this.materialSelection = {};    // Material applied to selection meshes
    this.materials = [];            // Currently selected material array
    this.materialsSolid = [];       // Solid material array, used by default
    this.materialsWire = [];        // Wireframe material array, selectable in GUI
    this.canvas = canvas;

    // Underscore method which binds 'this' to 'trimeshter' in all these functions
    _.bindAll(this, 'onStart', 'onMove', 'onEnd', 'animate', 'killMesh');

    this.init();
};

/**
 * Calls all init modules
 */
Trimeshter.prototype.init =  function () {
    this.initConfig();
    this.initGui();
    this.initThree();
    this.initMaterials();
    this.animate();
};

/**
 * Setup custom config settings
 * These are all adjustable from dat.GUI
 */
Trimeshter.prototype.initConfig = function() {
    this.config = {
        mirror: false,
        connectToSelf: false,
        randomZ: 10,
        wireframe: false,
        tween: {
            active: true,
            growDuration: 0.5,
            lifetime: 10
        },
        drift: {
            x: 0.0,
            y: 0.0,
            z: 0.0
        }
    };
};

/**
 * Set up Dat.GUI controls
 */
Trimeshter.prototype.initGui = function(){
    var gui = new dat.GUI({
        preset: 'Default',
        load:
            '{"remembered":{"Default":{"0":{"mirror":false,"connectToSelf":false,"wireframe":false,"randomZ":10},"1":{"x":0,"y":0,"z":0},"2":{"active":true,"growDuration":0.5,"lifetime":10}},"Shrink":{"0":{"mirror":false,"connectToSelf":false,"wireframe":false,"randomZ":10},"1":{"x":0,"y":0,"z":-3},"2":{"active":true,"growDuration":0.5,"lifetime":10}},"OffLeft":{"0":{"mirror":false,"connectToSelf":false,"wireframe":false,"randomZ":10},"1":{"x":-0.2721006376012407,"y":0,"z":-0.05972772703773899},"2":{"active":true,"growDuration":0.5,"lifetime":20}},"WireCave":{"0":{"mirror":true,"connectToSelf":false,"wireframe":true,"randomZ":10},"1":{"x":0,"y":0,"z":-0.743511976563846},"2":{"active":true,"growDuration":0.5,"lifetime":10}}},"preset":"OffLeft","closed":false,"folders":{"Building":{"preset":"Default","closed":false,"folders":{}},"Tween":{"preset":"Default","closed":false,"folders":{}},"Drift":{"preset":"Default","closed":false,"folders":{}}}}'
    });

    var config = this.config;

    var guiBuild = gui.addFolder("Building");
    guiBuild.add(config, 'mirror');
    guiBuild.add(config, 'connectToSelf');
    var wframe = guiBuild.add(config, 'wireframe');
    wframe.onChange(function (value) {
        this.materials = value ? this.materialsWire : this.materialsSolid
    });
    guiBuild.add(config, 'randomZ', 0, 100);
    guiBuild.open();

    var guiTween = gui.addFolder("Tween");
    guiTween.add(config.tween, 'active');
    guiTween.add(config.tween, 'growDuration', 0, 3);
    guiTween.add(config.tween, 'lifetime', 3, 100);
    guiTween.open();

    var guiDrift = gui.addFolder("Drift");
    guiDrift.add(config.drift, 'x', -1, 1);
    guiDrift.add(config.drift, 'y', -1, 1);
    guiDrift.add(config.drift, 'z', -3, 0.1);
    guiDrift.open();

    gui.remember(config);
    gui.remember(config.drift);
    gui.remember(config.tween);

    this.gui = gui;
};

/**
 * Set up THREE.js scene
 */
Trimeshter.prototype.initThree = function(){
    var renderer = new THREE.WebGLRenderer({canvas: this.canvas, antialias: true});

    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
    var projector = new THREE.Projector();
    camera.position.z = 100;

    // THREEx plugins
    THREEx.WindowResize(renderer, camera);

    this.scene = new THREE.Scene();

    // Make wall for pointer intersection
    this.wall = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshBasicMaterial({color: 0x89898900}));

    // Set Default objects
    this.geoTri = this.buildMasterObject();
    this.materialSelection = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: false, side: THREE.DoubleSide });

    // save local variables to Trimeshter object
    this.renderer = renderer;
    this.camera = camera;
    this.projector = projector;
};

/**
 * Create materials array to use
 * There are several palettes to choose from
 * And we generate a solid and wireframe array of our chosen palette
 */
Trimeshter.prototype.initMaterials = function(){
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

    this.materialsSolid = this.buildMaterials(pl1, false);
    this.materialsWire = this.buildMaterials(pl1, true);

    this.materials = this.materialsSolid;
};

/**
 * Create the object that will be cloned to create all new objects
 * @returns Geometry
 */
Trimeshter.prototype.buildMasterObject = function(){
    var triangle = new THREE.Shape([
        new THREE.Vector2 (-0.5,  -0.75),
        new THREE.Vector2 (0.5, -0.75),
        new THREE.Vector2 (0, 0)
    ]);

//	var geometry = new THREE.ExtrudeGeometry(triangle, { amount:2 });
    var geometry = triangle.makeGeometry();
    geometry.computeFaceNormals();
    geometry.computeVertexNormals();

    geometry.faceVertexUvs[0][0][0] = new THREE.Vector2( -1, 0 );
    geometry.faceVertexUvs[0][0][2] = new THREE.Vector2( 1, 0 );
    geometry.faceVertexUvs[0][0][1] = new THREE.Vector2( 0, 1 );

    return geometry;
};

/**
 * Generate materials from color palette
 * @param palette
 * @param wireframe
 * @returns {Array}
 */
Trimeshter.prototype.buildMaterials = function( palette, wireframe ){
    var result = [];
    var width = 256;
    var height = 256;

    for( var i in palette ){
        var color = palette[i];

        // Prepare off-screen canvas
        var bitmap = document.createElement('canvas');
        var ctx = bitmap.getContext('2d');
        bitmap.width = 256;
        bitmap.height = 256;

        // Draw Gradient
        var grd = ctx.createLinearGradient(0,0,0,height);  //x0, y0, x1, y1
        grd.addColorStop(0, 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',0)');
        grd.addColorStop(1, 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',1)');

        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, width, height);

        var texture = new THREE.Texture(bitmap);
        texture.needsUpdate = true;

        // Push generated texture into array as Material
        result.push(
            new THREE.MeshBasicMaterial({
                transparent:true,
                map:texture,
                wireframe:wireframe,
                side: THREE.DoubleSide
            })
        );
    }

    return result;
};

/**
 * Add selection mesh to scene and selectionMeshes array
 * @param touchid
 */
Trimeshter.prototype.addSelectionMeshes = function(touchid){
    var numSelectionsToMake = this.config.mirror ? 2 : 1;
    // Create and Add all selection meshes
    for ( var i = 0; i < numSelectionsToMake; i++ ) {
//        var material = this.getRandomMaterial();
        var material = this.materialsSolid[0];
        var mesh = new THREE.Mesh( this.geoTri.clone(), material.clone() );
        mesh.geometry.dynamic = true;
        mesh.touchid = touchid;
        this.selectionMeshes.push( mesh );
        this.scene.add( mesh );
    }
};

/**
 * Removes selection mesh created by target touch id
 * Splices from selectionMeshes array and removes from scene
 * @param touchid
 */
Trimeshter.prototype.removeSelectionMeshes = function(touchid){
    for( var i = this.selectionMeshes.length - 1; i >= 0; i--){
        if(this.selectionMeshes[i].touchid == touchid){
            var mesh = this.selectionMeshes.splice(i,1)[0];
            this.scene.remove(mesh);
        }
    }
};

/**
 * Update all selection meshes
 * Render Scene
 * Call requestAnimationFrame(self)
 */
Trimeshter.prototype.animate = function () {

    if(this.config.drift.x != 0 || this.config.drift.y != 0 || this.config.drift.z != 0) {
        for (var i = 0; i < this.allMeshes.length; i++) {
            var mesh = this.allMeshes[i];
            for (var v = 0; v < mesh.geometry.vertices.length; v++) {
                var vertex = mesh.geometry.vertices[v];
                vertex.x += this.config.drift.x;
                vertex.y += this.config.drift.y;
                vertex.z += this.config.drift.z;
            }
            mesh.geometry.verticesNeedUpdate = true;
        }
    }

    for (var i = this.selectionMeshes.length - 1; i >= 0; i--) {
        this.selectionMeshes[i].geometry.verticesNeedUpdate = true;
    }

    this.renderer.render( this.scene, this.camera );
    requestAnimationFrame( this.animate );
};

/**
 * Main hook for Inputs
 * Adds new selection mesh
 * @param event has x, y, id
 */
Trimeshter.prototype.onStart = function( event ){
    this.addSelectionMeshes(event.id);
};

/**
 * Main hook for Inputs
 * Updates geometry of selection mesh based on nearest points
 * TODO: make search its own function?
 * @param event has x, y, id
 */
Trimeshter.prototype.onMove = function( event ){

    var x = ( event.x / this.canvas.width ) * 2 - 1;
    var y = - ( event.y / this.canvas.height ) * 2 + 1;
    var z = event.z || 0;

    var position = this.getWorldPosition( x, y );
    if( position ) {
        for (var i = this.selectionMeshes.length - 1; i >= 0; i--) {

            var mesh = this.selectionMeshes[i];

            if (mesh.touchid == event.id) {

                // set third vertex to cursor position
                var vertex = mesh.geometry.vertices[2];
                var isEven = (i % 2 == 0);

                if (isEven && this.config.mirror) {
                    var middle = window.innerWidth / 2;
                    var isRightSide = (position.x > 0);
                    var offset = Math.abs(position.x);
                    if (isRightSide) {
                        // Flip to Left Side
                        vertex.x = -offset;
                    } else {
                        // Flip to Right Side
                        vertex.x = offset;
                    }
                } else {
                    vertex.x = position.x;
                }

                var sortedPoints = [];
                var allPoints = [];

                // construct allPoints from allMeshes
                this.allMeshes.forEach(function (mesh){
                    mesh.geometry.vertices.forEach(function (vertex){
                        allPoints.push( vertex );
                    });
                });

                // clear dupes
                allPoints = allPoints.filter( function( item, index, inputArray ) {
                    return inputArray.indexOf(item) == index;
                });

                allPoints.forEach(function (point) {
                    sortedPoints.push({ x: point.x, y: point.y, d: point.distanceTo(vertex)});
                });

                // search through selection meshes, too
                if(this.config.connectToSelf){
                    this.selectionMeshes.forEach(function (mesh){
                        if(mesh.touchid != event.id){
                            for(var i = 0; i < 3; i++){
                                var point = mesh.geometry.vertices[i];
                                sortedPoints.push({x: point.x, y:point.y, d:point.distanceTo(vertex)});
                            }
                        }
                    });
                }

                this.sortByKey(sortedPoints, "d");

                vertex.y = position.y;
                vertex.z = z;

                vertex = mesh.geometry.vertices[0];
                var targetPoint = sortedPoints[0] || new THREE.Vector2(0,0);
                vertex.x = targetPoint.x;
                vertex.y = targetPoint.y;

                // Make sure picked points have some space between them
                var secondPointIndex = 1;
                var tooSmall = true;
                while (tooSmall) {
                    var secondPoint = sortedPoints[ secondPointIndex ];
                    if(secondPoint){
                        var innerDistance = new THREE.Vector2(secondPoint.x, secondPoint.y).distanceTo(sortedPoints[0]);
                        tooSmall = ( innerDistance < 2 );
                        secondPointIndex++;
                    } else {
                        secondPointIndex = 0;
                        tooSmall = false;
                    }
                }

                var targetVertex = mesh.geometry.vertices[1];
                targetPoint = sortedPoints[ secondPointIndex ] || new THREE.Vector2(0,0);
                targetVertex.x = targetPoint.x;
                targetVertex.y = targetPoint.y;

            }
        }
    }

};

/**
 * Main hook for Inputs
 * Creates new mesh from selection mesh, then deletes selection
 * New mesh is assigned a lifetime and grown in with a Tween
 * @param event
 */
Trimeshter.prototype.onEnd = function( event ) {

    var x = ( event.x / this.canvas.width ) * 2 - 1;
    var y = - ( event.y / this.canvas.height ) * 2 + 1;
    var z = event.z || this.getRandomArbitrary(this.config.randomZ, -this.config.randomZ);
    var self = this;    // store this for use in Tween functions below

    var position = this.getWorldPosition( x, y );
    if( position ) {
        // get material to share for all new meshes
        var material = this.getRandomMaterial();

        for (var i = this.selectionMeshes.length - 1; i >= 0; i--) {
            var mesh = this.selectionMeshes[i];

            if (mesh.touchid == event.id) {

                mesh.geometry.vertices[2].z = z;

                // add new Mesh to scene
                var meshClone = new THREE.Mesh(mesh.geometry.clone(), material);

                // add a second, wireframe mesh to the scene
                var meshClone2 = new THREE.Mesh(mesh.geometry.clone(), this.materialsWire[1].clone());
                meshClone2.scale.x = meshClone2.scale.y = meshClone2.scale.z = 1.01;

                // Add the meshes to the scene
                var newMeshes = [meshClone, meshClone2];
                for (m in newMeshes) {
                    this.growNewObject(newMeshes[m]);
                }

            }

            this.removeSelectionMeshes(event.id);
        }
    }
};

/**
 * Add Mesh to allMeshes and scene
 * Grow it in, tween it out
 * @param mesh
 */
Trimeshter.prototype.growNewObject = function (mesh) {
    mesh.geometry.dynamic = true;
    this.allMeshes.push(mesh);
    this.scene.add(mesh);

    if(this.config.tween.active) {

        // initial growth tween
        var vertex = mesh.geometry.vertices[2];
        var targetPoint = vertex.clone();
        var ungrownPoint = mesh.geometry.vertices[0];
        vertex.set(ungrownPoint.x, ungrownPoint.y, ungrownPoint.z);
        TweenMax.to(vertex, this.config.tween.growDuration, {
            ease: Cubic.easeOut,
            x: targetPoint.x,
            y: targetPoint.y,
            z: targetPoint.z
        });

        // Lifetime tween
        TweenMax.to(mesh, this.config.tween.lifetime, {
            onComplete: this.killMesh,
            onCompleteParams: ["{self}"],
            onUpdate: function(){
                this.target.geometry.verticesNeedUpdate = true;
            }
        });

        // Transition out at end of lifetime
        TweenMax.to(vertex, this.config.tween.growDuration, {
            delay: this.config.tween.lifetime - this.config.tween.growDuration,
            ease: Expo.easeIn,
            onStart:function(){
                this.updateTo({
                    x: mesh.geometry.vertices[0].x,
                    y: mesh.geometry.vertices[0].y,
                    z: mesh.geometry.vertices[0].z
                });
            }
        })
    }

};

/**
 * Remove mesh from allMeshes and scene
 * @param tween
 */
Trimeshter.prototype.killMesh = function(tween){
    var idx = this.allMeshes.indexOf(tween.target);
    if(idx > -1){
        this.allMeshes.splice( idx,1);
    }
    this.scene.remove(tween.target);
};

/**
 * Gets a random selection from the selected materials array
 * @returns THREE.Material
 */
Trimeshter.prototype.getRandomMaterial = function() {
    return this.materials[ Math.floor( Math.random() * this.materials.length  )];
};

/**
 * Finds the world position from x&y screen positions
 * @param x
 * @param y
 * @returns {*}
 */
Trimeshter.prototype.getWorldPosition = function( x, y ) {
    var vector = new THREE.Vector3(  x, y, 0 );
    this.projector.unprojectVector( vector, this.camera );

    var raycaster = new THREE.Raycaster( this.camera.position, vector.sub( this.camera.position ).normalize() );
    var intersects = raycaster.intersectObjects( [this.wall] );

    if ( intersects.length > 0 ){
        return( intersects[0].point );
    } else {
        return false;
    }
};

/**
 * Sorts an array by one of its keys
 * TODO: make this an array prototype method? Maybe an mmm utils class?
 * @param array
 * @param key
 * @returns sorted {Array}
 */
Trimeshter.prototype.sortByKey = function(array, key) {
    return array.sort(function(a, b) {
        var x = a[key]; var y = b[key];
        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    });
};

/**
 * Returns a random number between min and max
 * @param min
 * @param max
 * @returns {*}
 */
Trimeshter.prototype.getRandomArbitrary = function(min, max) {
    return Math.random() * (max - min) + min;
};