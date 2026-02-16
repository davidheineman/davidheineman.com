import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';

const container = document.getElementById('teapot-container');
const canvas = document.getElementById('teapots');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

const width = container.clientWidth;
const height = container.clientHeight;
const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 1000);
camera.position.set(2, 5, 12);
camera.lookAt(0.2, 1.5, 0);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(width, height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const redCeramicMat = new THREE.MeshPhysicalMaterial({
    color: 0xcc2222,
    metalness: 0.0,
    roughness: 0.4,
    clearcoat: 0.5,
    clearcoatRoughness: 0.25,
    reflectivity: 0.4,
});

const loader = new STLLoader();

// STL coords: X [-54,84], Y [-54,54], Z [0,167] (Z is up)
// Three.js: Y is up
// Scale: 0.02 → 167mm ≈ 3.34 units
const SCALE = 0.02;

const TEAPOT_SPACING = 2.8;
const TEAPOT_COUNT = 5;
const AUTO_ROTATE_SPEED = 0.25;
const PUSH_SENSITIVITY = 0.012;   // how much mouse speed adds to spin (rad per pixel)
const SPIN_FRICTION = 2.5;       // how fast the pushed spin decays (per second)
const CLICK_PUSH_IMPULSE = 14;   // rad/s added on click (momentum, then friction slows it)

const teapotGroups = [];
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let lastPointerX = null;
let lastPointerY = null;

function prepareGeometry(geometry) {
    geometry.computeVertexNormals();
    geometry.scale(SCALE, SCALE, SCALE);
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(-15 * SCALE, 0, 0);
}

function addTeapotAt(bodyGeo, topGeo, x, index) {
    const group = new THREE.Group();
    group.position.set(x, 0, 0);
    group.rotation.y = (index / TEAPOT_COUNT) * Math.PI * 2;
    group.userData.spinVelocity = 0;   // extra rad/s from push/click, decays over time

    const bodyMesh = new THREE.Mesh(bodyGeo.clone(), redCeramicMat);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    bodyMesh.userData.teapotGroup = group;
    group.add(bodyMesh);

    const topMesh = new THREE.Mesh(topGeo.clone(), redCeramicMat);
    topMesh.castShadow = true;
    topMesh.receiveShadow = true;
    topMesh.userData.teapotGroup = group;
    group.add(topMesh);

    scene.add(group);
    teapotGroups.push(group);
}

function getTeapotUnderPointer() {
    raycaster.setFromCamera(mouse, camera);
    const meshes = teapotGroups.flatMap((g) => g.children);
    const hits = raycaster.intersectObjects(meshes);
    const hit = hits[0];
    return hit?.object?.userData?.teapotGroup ?? null;
}

function setMouseFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
}

let bodyGeo = null;
let topGeo = null;

function tryAddRow() {
    if (!bodyGeo || !topGeo) return;
    const start = -0.5 * (TEAPOT_COUNT - 1) * TEAPOT_SPACING;
    for (let i = 0; i < TEAPOT_COUNT; i++) {
        addTeapotAt(bodyGeo, topGeo, start + i * TEAPOT_SPACING, i);
    }
}

loader.load('models/body.stl', (geometry) => {
    prepareGeometry(geometry);
    bodyGeo = geometry;
    tryAddRow();
});

loader.load('models/top.stl', (geometry) => {
    prepareGeometry(geometry);
    topGeo = geometry;
    tryAddRow();
});

// --- Ground plane
const groundGeo = new THREE.PlaneGeometry(50, 30);
const groundMat = new THREE.ShadowMaterial({ opacity: 0.1 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.05;
ground.receiveShadow = true;
scene.add(ground);

// --- Lighting
const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
keyLight.position.set(5, 8, 5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.width = 2048;
keyLight.shadow.mapSize.height = 2048;
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 30;
keyLight.shadow.camera.left = -15;
keyLight.shadow.camera.right = 15;
keyLight.shadow.camera.top = 5;
keyLight.shadow.camera.bottom = -5;
keyLight.shadow.radius = 4;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xe8eeff, 0.6);
fillLight.position.set(-4, 4, -2);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 0.4);
rimLight.position.set(0, 2, -6);
scene.add(rimLight);

// --- Resize
window.addEventListener('resize', () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
});

// --- Mouse: push teapots (mouse speed adds spin); click = 360° spin
canvas.addEventListener('pointermove', (e) => {
    setMouseFromEvent(e);
    const over = getTeapotUnderPointer();
    if (over && lastPointerX !== null) {
        const dx = e.clientX - lastPointerX;
        over.userData.spinVelocity += dx * PUSH_SENSITIVITY;
    }
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
});

canvas.addEventListener('pointerdown', (e) => {
    setMouseFromEvent(e);
    const hit = getTeapotUnderPointer();
    if (hit) {
        hit.userData.spinVelocity += CLICK_PUSH_IMPULSE;  // big push, then friction slows it
    }
});

canvas.addEventListener('pointerleave', () => {
    lastPointerX = null;
    lastPointerY = null;
});

// --- Render loop
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    teapotGroups.forEach((group) => {
        const spin = (AUTO_ROTATE_SPEED + group.userData.spinVelocity) * delta;
        group.rotation.y += spin;
        group.userData.spinVelocity *= Math.max(0, 1 - SPIN_FRICTION * delta);
    });
    renderer.render(scene, camera);
}

animate();
