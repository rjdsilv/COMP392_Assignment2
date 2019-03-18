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
 * THREE.js controls declaration.
 */
const renderer = new THREE.WebGLRenderer({ antialias: true });
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1.0, 1000);
const orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
const container = new THREE.Object3D();


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
    camera.position.set(0, 30, 85);
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
        directionalLight.position.set(20, 35, 50);
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
        new THREE.CubeGeometry(150, 50, 3.5),
        new THREE.MeshLambertMaterial({ color: 0xaadd00, map: new THREE.TextureLoader().load('assets/textures/table.jpg') })
        );
    table.receiveShadow = true;
    table.rotation.x = -Math.PI * 0.5;
    table.position.y = -25;
    scene.add(table);
}

/**
 * Function that will create and set up the GUI controls.
 */
function setupDatGui() {

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
    render();
}
