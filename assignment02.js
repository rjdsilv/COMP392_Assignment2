/**
 * @author Rodrigo da Silva
 * @author Jalpen Desai
 * @author Jiabin Tang
 * 
 * Date     : March 22, 2019
 * File name: assignment02.js
 * Purpose  : Implement Advanced Graphics' second assignment.
 */

/**
 * Physijs declaration
 */
Physijs.scripts.worker = '/libs/physiji_worker.js';

/**
 * THREE.js controls declaration.
 */
const renderer = new THREE.WebGLRenderer({ antialias: true });
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1.0, 1000);
const orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
const container = new THREE.Object3D();

// Game variable declarations.
const TABLE_Y = -25;
const TABLE_H = 3.75;
const gameBoxes = [];

// DAT.GUI Controls.
const controls = {
    filename: 'game01',
    port: 5500,
    load: function () {
        readFile(controls.port, controls.filename);
    }
};


/**
 * Initialization function, which will initialize all the necessary components for the application.
 */
function init() {
    // Setting up the renderer.
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x004400);
    renderer.shadowMap.enabled = true;

    // Adding the renderer to the DOM.
    document.body.appendChild(renderer.domElement);
}

/**
 * Function that will set up the camera and the lights in the scene. For this scene we will have a
 * an ambient light, a directional light, and an hemisphere light set up.
 */
function setupCameraAndLight() {
    camera.position.set(0, 30, 90);
    camera.lookAt(scene.position);

    /**
     * Function that will create an ambient light and return it.
     */
    const createAmbientLight = () => {
        return new THREE.AmbientLight(0x666666);
    };

    /**
     * Function that will create a directional light and return it.
     */
    const createDirectionalLight = () => {
        let directionalLight = new THREE.DirectionalLight(0xffffff);
        directionalLight.position.set(-30, 35, 35);
        directionalLight.castShadow = true;
        directionalLight.target = scene;
        directionalLight.shadow.camera.near = 0.1;
        directionalLight.shadow.camera.far = 200;
        directionalLight.shadow.camera.left = -50;
        directionalLight.shadow.camera.right = 50;
        directionalLight.shadow.camera.top = 50;
        directionalLight.shadow.camera.bottom = -50;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        return directionalLight;
    };

    const createHemisphereLight = () => {
        let hemiSphereLight = new THREE.HemisphereLight(0x7777cc, 0x00ff00, 0.25);//skycolor, groundcolor, intensity  
        hemiSphereLight.position.set(0, 100, 0);
        return hemiSphereLight;
    }

    scene.add(createAmbientLight());
    scene.add(createDirectionalLight());
    scene.add(createHemisphereLight());
}

/**
 * Function that will create the scene geometry
 */
function createGeometry() {
    scene.add(new THREE.AxesHelper(100));
    let table = new THREE.Mesh(
        new THREE.CubeGeometry(150, 50, TABLE_H),
        new THREE.MeshLambertMaterial({ color: 0xaadd00, map: new THREE.TextureLoader().load('assets/textures/table.jpg') })
    );
    table.receiveShadow = true;
    table.rotation.x = -Math.PI * 0.5;
    table.position.y = TABLE_Y;
    scene.add(table);
}

/**
 * Function that will create the box based on the given data.
 * 
 * @param {*} boxData
 */
function createBox(boxData) {
    let box = new THREE.Mesh(
        new THREE.CubeGeometry(boxData.size, boxData.size, boxData.size),
        new THREE.MeshStandardMaterial({ color: parseInt(boxData.color) })
    );
    box.castShadow = true;
    box.receiveShadow = true;
    box.position.set(boxData.posX, boxData.size / 2 + TABLE_Y + TABLE_H / 2, boxData.size / 2);
    return box;
}

/**
 * Function that will create physic object
 * 
 * @param {*} data - Data from JSON file
 */
function createPhysicBox(gameData) {
    let blockGeometry = new THREE.BoxGeometry(gameData.box.width, gameData.box.height, gameData.box.depth);
    let blockMaterial = Physijs.createMaterial(new THREE.MeshStandardMaterial(
        { color: gameData.material.color, transparent: gameData.material.transparent, opacity: gameData.material.opacity }), gameData.material.friction, gameData.material.restitution);
    let block = new Physijs.BoxMesh(blockGeometry, blockMaterial, data.mass);
    block.position.set(data.x, data.y, data.z);
    block.castShadow = data.castShadow;
    block.receiveShadow = data.receiveShadow;
    return block;
}

function createGame(gameData) {
    for (boxData of gameData) {
        const box = createBox(boxData);
        gameBoxes.push(box);
        scene.add(box);
    }
}

/**
 * Function that will create and set up the GUI controls.
 */
function setupDatGui() {
    const gameFiles = {
        'Game 1': 'game01',
        'Game 2': 'game02',
        'Game 3': 'game03',
        'Game 4': 'game04',
        'Game 5': 'game05'
    };

    let gui = new dat.GUI();
    gui.add(controls, 'filename', gameFiles).name('Game Selection').onChange((e) => { controls.filename = e; });
    gui.add(controls, 'port', 5500, 5599).step(1).name('Port').onChange((e) => { controls.port = e; });
    gui.add(controls, 'load').name('Load');
}

/**
 * Reads the JSON file represented by filename on the given port to create the game.
 * 
 * @param {*} port     The port to be used.
 * @param {*} filename The file name to be used.
 */
function readFile(port, filename) {
    let url = `http://localhost:${port}/assets/games/${filename}.json`;
    let request = new XMLHttpRequest();
    request.open('GET', url);
    request.responseType = 'text'; //try text if this doesn’t work
    request.send();
    request.onload = () => {
        createGame(JSON.parse(request.responseText));
    }
}

/**
 * Function that will render the whole scene.
 */
function render() {
    orbitControls.update();

    // Rotates the whole scene.
    // if (controls.rotateScene) {
    //     scene.rotateY(controls.speed);
    // }

    // Rotates the wheel.
    // if (controls.rotateWheel) {
    //     container.rotateZ(controls.wheelSpeed);
    //     for (let i = 0; i < baskets.length; i++) {
    //         baskets[i].rotateZ(-controls.wheelSpeed);
    //     }
    // }

    // Renders the scene
    renderer.render(scene, camera);
    requestAnimationFrame(render);
}

/**
 * Executed when the window first loads.
 */
window.onload = () => {
    init();
    setupCameraAndLight();
    createGeometry();
    setupDatGui();
    readFile(controls.port, controls.filename);
    render();
}
