import * as THREE from "three"
import { OrbitControls } from "https://unpkg.com/three@0.112/examples/jsm/controls/OrbitControls.js";

//needs camera, renderer, etc

const W = window.innerWidth;
const H = window.innerHeight;
const renderer = new THREE.WebGLRenderer(); //antialias helps blend colors ig

renderer.setSize(W, H);
document.body.appendChild(renderer.domElement) //append to DOM a new element. YESS MY JS IS COMING BACK

//takes fov, aspect, near, far
const fov = 75 //in degrees
const aspect = W / H //aspect ratio
const near = 0.1 //anything too close is not rendered
const far = 10 //anything too far is not rendered either

const cam = new THREE.PerspectiveCamera(fov, aspect, near, far)
cam.position.z = 2;
const scene = new THREE.Scene(); //adds the scene ig



const size = 10;
const divisions = 10;
const gridHelperXY = new THREE.GridHelper( size, divisions );
scene.add( gridHelperXY );

// 3.js has some base objects you can just shove in

//geometry + material applied are combined in mesh
const geo = new THREE.IcosahedronGeometry(1, 2);
const mat = new THREE.MeshStandardMaterial(({
    color: 0xcff,
    flatShading :true
}
)) 

const mesh = new THREE.Mesh(geo, mat);
// scene.add(mesh);

const geometry = new THREE.SphereGeometry(.2, 32, 16 );
const material = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
const sphere = new THREE.Mesh( geometry, material );
scene.add( sphere );

//add a light to the thing.
const hemilight = new THREE.HemisphereLight(0xffff, 0x000);
scene.add(hemilight)


//seprate import fo this shit
const controls = new OrbitControls(cam, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.03; 

mesh.position.x = 4.5
/*
uhh animate animates the object
t is the timestep (not dt)
animate gets called over and over again ig. why?
*/
function animate(t=0){
    requestAnimationFrame(animate);

    mesh.rotation.y = t * 0.01
    renderer.render(scene, cam)

    //makes it so that u can move it.
    controls.update()
}

animate();

/*
Other notes: Can also add things as children to other things so that they can like move together.
*/

 