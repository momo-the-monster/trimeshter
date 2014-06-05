var camera, scene, renderer, projector;     // Boilerplate Three.js items
var wall;                                   // Touch points intersect wall to find scene positions
var allMeshes = new Array();                // Generated mesh items stored here
var selectionMeshes = new Array();          // In-progress selection meshes
var geoTri;                                 // Master object used to create new meshes
var materialSelection;                      // Material applied to selection meshes
var materials;                              // Currently selected material array
var materialsSolid;                         // Solid material array, used by default
var materialsWire;                          // Wireframe material array, selectable in GUI

var config = {
    mirror:false,
    connectToSelf:false,
    randomZ: 10,
    wireframe: false,
    tween:{
        active: true,
        growDuration: 0.5,
        lifetime: 10
    },
    drift:{
        x: 0.0,
        y: 0.0,
        z: 0.0
    }

};          // Config options, all adjustable via dat.GUI

/**
 * Calls all init modules
 */
var init = function () {
    initGui();
    initThree();
    initMaterials();
};

/**
 * Set up Dat.GUI controls
 */
function initGui(){
    var gui = new dat.GUI({
        preset: 'Default',
        load:
            '{"remembered":{"Default":{"0":{"mirror":false,"connectToSelf":false,"wireframe":false,"randomZ":10},"1":{"x":0,"y":0,"z":0},"2":{"active":true,"growDuration":0.5,"lifetime":10}},"Shrink":{"0":{"mirror":false,"connectToSelf":false,"wireframe":false,"randomZ":10},"1":{"x":0,"y":0,"z":-3},"2":{"active":true,"growDuration":0.5,"lifetime":10}},"OffLeft":{"0":{"mirror":false,"connectToSelf":false,"wireframe":false,"randomZ":10},"1":{"x":-0.2721006376012407,"y":0,"z":-0.05972772703773899},"2":{"active":true,"growDuration":0.5,"lifetime":20}},"WireCave":{"0":{"mirror":true,"connectToSelf":false,"wireframe":true,"randomZ":10},"1":{"x":0,"y":0,"z":-0.743511976563846},"2":{"active":true,"growDuration":0.5,"lifetime":10}}},"preset":"OffLeft","closed":false,"folders":{"Building":{"preset":"Default","closed":false,"folders":{}},"Tween":{"preset":"Default","closed":false,"folders":{}},"Drift":{"preset":"Default","closed":false,"folders":{}}}}'
        });

    var guiBuild = gui.addFolder("Building");
    guiBuild.add(config, 'mirror');
    guiBuild.add(config, 'connectToSelf');
    var wframe = guiBuild.add(config, 'wireframe');
    wframe.onChange(function (value) {
        materials = value ? materialsWire : materialsSolid
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
}

/**
 * Set up THREE.js scene
 */
function initThree(){
    renderer = new THREE.WebGLRenderer({antialias: true});

    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
    projector = new THREE.Projector();
    camera.position.z = 100;

    // THREEx plugins
    THREEx.WindowResize(renderer, camera);

    scene = new THREE.Scene();

    // Make wall for pointer intersection
    wall = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshBasicMaterial({color: 0x89898900}));

    // Set Default objects
    geoTri = buildMasterObject();
    materialSelection = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, side: THREE.DoubleSide });
}

/**
 * Create materials array to use
 * There are several palettes to choose from
 * And we generate a solid and wireframe array of our chosen palette
 */
function initMaterials(){
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

    materialsSolid = buildMaterials(pl1, false);
    materialsWire = buildMaterials(pl1, true);

    materials = materialsSolid;
}

/**
 * Create the object that will be cloned to create all new objects
 * @returns Geometry
 */
function buildMasterObject(){
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
}

/**
 * Generate materials from color palette
 * @param palette
 * @param wireframe
 * @returns {Array}
 */
function buildMaterials( palette, wireframe ){
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
}

/**
 * Add selection mesh to scene and selectionMeshes array
 * @param touchid
 */
function addSelectionMeshes(touchid){
    var numSelectionsToMake = config.mirror ? 2 : 1;
    // Create and Add all selection meshes
    for ( var i = 0; i < numSelectionsToMake; i++ ) {
        var mesh = new THREE.Mesh( geoTri.clone(), materialSelection.clone() );
        mesh.geometry.dynamic = true;
        mesh.touchid = touchid;
        selectionMeshes.push( mesh );
        scene.add( mesh );
    }
}

/**
 * Removes selection mesh created by target touch id
 * Splices from selectionMeshes array and removes from scene
 * @param touchid
 */
function removeSelectionMeshes(touchid){
    for( var i = selectionMeshes.length - 1; i >= 0; i--){
        if(selectionMeshes[i].touchid == touchid){
            var mesh = selectionMeshes.splice(i,1)[0];
            scene.remove(mesh);
        }
    }
}

/**
 * Update all selection meshes
 * Render Scene
 * Call requestAnimationFrame(self)
 */
var animate = function () {

    if(config.drift.x != 0 || config.drift.y != 0 || config.drift.z != 0) {
        for (var i = 0; i < allMeshes.length; i++) {
            var mesh = allMeshes[i];
            for (var v = 0; v < mesh.geometry.vertices.length; v++) {
                var vertex = mesh.geometry.vertices[v];
                vertex.x += config.drift.x;
                vertex.y += config.drift.y;
                vertex.z += config.drift.z;
            }
            mesh.geometry.verticesNeedUpdate = true;
        }
    }

    for (var i = selectionMeshes.length - 1; i >= 0; i--) {
        selectionMeshes[i].geometry.verticesNeedUpdate = true;
    }

    requestAnimationFrame( animate );
    renderer.render( scene, camera );
};

/**
 * Main hook for Inputs
 * Adds new selection mesh
 * @param event has x, y, id
 */
function onStart( event ){
    addSelectionMeshes(event.id);
}

/**
 * Main hook for Inputs
 * Updates geometry of selection mesh based on nearest points
 * TODO: make search its own function?
 * @param event has x, y, id
 */
function onMove( event ) {

    var x = ( event.x / renderer.domElement.width ) * 2 - 1;
    var y = - ( event.y / renderer.domElement.height ) * 2 + 1;
    var z = 0;

    var position = getWorldPosition( x, y );
    if( position ) {
        for (var i = selectionMeshes.length - 1; i >= 0; i--) {

            var mesh = selectionMeshes[i];

            if (mesh.touchid == event.id) {

                // set third vertex to cursor position
                var vertex = mesh.geometry.vertices[2];
                var isEven = (i % 2 == 0);

                if (isEven && config.mirror) {
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

                var sortedPoints = new Array();
                var allPoints = new Array();

                // construct allPoints from allMeshes
                allMeshes.forEach(function (mesh){
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
                if(config.connectToSelf){
                    selectionMeshes.forEach(function (mesh){
                        if(mesh.touchid != event.id){
                            for(var i = 0; i < 3; i++){
                                var point = mesh.geometry.vertices[i];
                                sortedPoints.push({x: point.x, y:point.y, d:point.distanceTo(vertex)});
                            }
                        }
                    });
                }

                sortByKey(sortedPoints, "d");

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

}

/**
 * Main hook for Inputs
 * Creates new mesh from selection mesh, then deletes selection
 * New mesh is assigned a lifetime and grown in with a Tween
 * @param event
 */
function onFinish( event ) {

    var x = ( event.x / renderer.domElement.width ) * 2 - 1;
    var y = - ( event.y / renderer.domElement.height ) * 2 + 1;

    var position = getWorldPosition( x, y );
    if( position ) {
        // get material to share for all new meshes
        var material = getRandomMaterial();

        for (var i = selectionMeshes.length - 1; i >= 0; i--) {
            var mesh = selectionMeshes[i];

            if(mesh.touchid == event.id){
                mesh.geometry.vertices[2].z = getRandomArbitrary(config.randomZ, -config.randomZ);
                // add new Mesh to scene
                var meshClone = new THREE.Mesh( mesh.geometry.clone(), material );
                meshClone.geometry.dynamic = true;
                allMeshes.push( meshClone);
                scene.add( meshClone );

                if(config.tween.active) {

                    // initial growth tween
                    var vertex = meshClone.geometry.vertices[2];
                    var targetPoint = vertex.clone();
                    var ungrownPoint = meshClone.geometry.vertices[0];
                    vertex.set(ungrownPoint.x, ungrownPoint.y, ungrownPoint.z);
                    TweenMax.to(vertex, config.tween.growDuration, {
                        ease: Cubic.easeOut,
                        x: targetPoint.x,
                        y: targetPoint.y,
                        z: targetPoint.z
                    });

                    // Lifetime tween
                    TweenMax.to(meshClone, config.tween.lifetime, {
                        onComplete: killMesh,
                        onUpdate: function(){
                            this.target.geometry.verticesNeedUpdate = true;
                        }
                    });

                    // Transition out at end of lifetime
                    TweenMax.to(vertex, config.tween.growDuration, {
                        delay: config.tween.lifetime - config.tween.growDuration,
                        ease: Expo.easeIn,
                        onStart:function(){
                            this.updateTo({
                                x: meshClone.geometry.vertices[0].x,
                                y: meshClone.geometry.vertices[0].y,
                                z: meshClone.geometry.vertices[0].z
                            });
                        }
                    })
                }

                function killMesh(){
                    allMeshes.splice( allMeshes.indexOf(this.target),1);
                    scene.remove(this.target);
                }

            }
        }

        removeSelectionMeshes(event.id);
    }
}

/**
 * Gets a random selection from the selected materials array
 * @returns THREE.Material
 */
function getRandomMaterial() {
    return materials[ Math.floor( Math.random() * materials.length  )];
}

/**
 * Finds the world position from x&y screen positions
 * @param x
 * @param y
 * @returns {*}
 */
function getWorldPosition( x, y ) {
    var vector = new THREE.Vector3(  x, y, 0 );
    projector.unprojectVector( vector, camera );

    var raycaster = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() );
    var intersects = raycaster.intersectObjects( [wall] );

    if ( intersects.length > 0 ){
        return( intersects[0].point );
    } else {
        return false;
    }
}

/**
 * Sorts an array by one of its keys
 * TODO: make this a prototype method?
 * @param array
 * @param key
 * @returns {Array|*}
 */
function sortByKey(array, key) {
    return array.sort(function(a, b) {
        var x = a[key]; var y = b[key];
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
 * Kick it all off!
 */
init();
animate();