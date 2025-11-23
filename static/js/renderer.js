import * as THREE from "three"
import { OrbitControls } from "https://unpkg.com/three@0.112/examples/jsm/controls/OrbitControls.js";
import { InteractionManager } from "./libs/three.interactive.js";
//Screen setup shit

const W = window.innerWidth;
const H = window.innerHeight;
const renderer = new THREE.WebGLRenderer(); //antialias helps blend colors ig

renderer.setSize(W, H);
document.getElementById("renderer").appendChild(renderer.domElement) 

//cam + lighting
const fov = 75 //in degrees
const aspect = W / H //aspect ratio
const near = 0.1 
const far = 1000000 
const cam = new THREE.PerspectiveCamera(fov, aspect, near, far)
cam.position.z = 2;
const scene = new THREE.Scene(); 
const controls = new OrbitControls(cam, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.03; 

//light + bg
const loader = new THREE.CubeTextureLoader();
loader.setPath("/static/textures/");
const bg = loader.load([
    'existentialdread.jpg','existentialdread.jpg','existentialdread.jpg','existentialdread.jpg','existentialdread.jpg','existentialdread.jpg'
]);
scene.background = bg

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // color, intensity
scene.add(ambientLight)

//grid
const size = 25;
const divisions = 10;
const gridHelperXZ = new THREE.GridHelper( size, divisions );
const gridHelperYZ = new THREE.GridHelper( size, divisions );
const gridHelperXY = new THREE.GridHelper( size, divisions );

gridHelperYZ.rotation.z = 0.5 * Math.PI
gridHelperYZ.position.x = - size /2

gridHelperXY.rotation.x = 0.5 * Math.PI
gridHelperXY.position.z = - size / 2

gridHelperXZ.position.y = -size / 2

scene.add( gridHelperXY );
scene.add( gridHelperYZ );
scene.add( gridHelperXZ );

//INTERACTIONS
const interactionManager = new InteractionManager(
    renderer,
    cam,
    renderer.domElement
)


//other fxns
function destroy(item){
    if (item.parent != null){
    item.parent.remove(item)

    }
    interactionManager.remove(item)
    item.geometry.dispose()
    item.material.dispose()
}

//Initial setup/info of bodies
async function setup(){
    let binfo = []
    await fetch('/get_body_info').then(response => { //await functions depending on what is returned: promise -> waits. normal val -> doesnt
        return response.json(); 
    }).then(data =>{
        binfo = data
    }
    )

    binfo.forEach(body => {
        body['trail'] = []
        const geometry = new THREE.SphereGeometry( body['r'], 32, 16 );
        const material = new THREE.MeshBasicMaterial( { color: body['c'] } );
        const sphere = new THREE.Mesh( geometry, material );
        body['sphere'] = sphere
        body['highlighted'] = false;
        scene.add( sphere );
        interactionManager.add(sphere)
        sphere.addEventListener('mousedown', (event) =>{
            for (let i = 0; i < body_info.length; i++){
                if(body_info[i]['sphere'] == event.target){
                    highlight(i);
                    break;
                }
            }})
    });

   return binfo

}

let body_info = await setup()

async function reload_bodies(keep_trails = false){
    body_info.forEach(info => {
        destroy(info['sphere'])
    })
    body_info = await setup();
}

//updates (movemetn)
function update_bodies(coords) {
    for (let i = 0; i < coords.length; i++) {    
        body_info[i]['sphere'].position.x = coords[i].x 
        body_info[i]['sphere'].position.y = coords[i].y 
        body_info[i]['sphere'].position.z = coords[i].z 

    }
}

let latestCoords = null;
const MAX_TRAIL = 300; // cap trail length
    async function pollCoords() {
        try {
            const response = await fetch('/coords', { cache: 'no-store' });
            if (response.ok) {
                latestCoords = await response.json();
            }
        } catch (e) {
            // ignore fetch errors
            console.log("whoopsies")
        }
        if (latestCoords != null){
        latestCoords.forEach(coord => {
        coord.x =  coord.x /100;
        coord.y =  coord.y /100;
        coord.z =  coord.z /100;
  

        });
        }


    }

//Removal/editing of shit
async function remove_body(idx){
    let toremove = body_info[idx];
    destroy(toremove['sphere'])
    body_info = body_info.filter((body) => body != toremove);

    fetch('/remove', {
        method: 'POST',  
        credentials: 'include',
        headers: {
        'Content-Type': 'application/json',  
        "Accept": "application/json"
        },
    body: JSON.stringify({ "index": idx}) 
    })

}  


//Animation
let prevtrails = []
function animate(t=0){
            try{

            if (latestCoords != null) {
                // Update trails
                for(let i = 0; i < body_info.length; i++){
                    // console.log(body_info[i])
                    body_info[i]['trail'].push({x:  latestCoords[i].x, y: latestCoords[i].y, z : latestCoords[i].z })
                    if (body_info[i]['trail'].length > MAX_TRAIL) body_info[i]['trail'].shift(); 
  

                }
                
                update_bodies(latestCoords)

                prevtrails.forEach(trail=>{
                    destroy(trail)
                })
                prevtrails = []

                body_info.forEach(info => {
                    const mat = new THREE.LineBasicMaterial({color: info['c']})
                    const geo = new THREE.BufferGeometry().setFromPoints(info['trail'] )
                    const line = new THREE.Line(geo, mat)
                    scene.add(line)
                    prevtrails.push(line)
                });
            }
       }catch (e){
    }
    requestAnimationFrame(animate);
    renderer.render(scene, cam) 
    controls.update()

}
setInterval(pollCoords, 50);

animate();

//UI

//nav functions
function openNav() {

  document.getElementById("mySidebar").style.width = "250px";
  document.getElementById("renderer").style.marginLeft = "250px";
}

function closeNav() {
  document.getElementById("mySidebar").style.width = "0";
  document.getElementById("renderer").style.marginLeft= "0";
}

//Highlights

let curhighlighted = null;
function highlight(idx){
    let body = body_info[idx]

    if (curhighlighted == body){
        //dehighlight
        destroy(curhighlighted['highlighted_mesh']) 
        curhighlighted['highlighted_mesh'] = null // removes old highlited

        closeNav()


        curhighlighted = null;
        return;
    }

    openNav()
    const geo = new THREE.SphereGeometry(body['r'] * 1.2, 32, 16)
    const material = new THREE.MeshBasicMaterial({
        color: body['c'], 
        transparent: true,
        opacity: 0.5,
})

body['highlighted_mesh'] = new THREE.Mesh(geo, material); 
body['sphere'].add(body['highlighted_mesh']);

if( curhighlighted != null ){
    destroy(curhighlighted['highlighted_mesh']) 
    curhighlighted['highlighted_mesh'] = null // removes old highlited
}

curhighlighted = body //now this is the currently clicked
}



//Controls
const header = document.getElementById("overlay-header");
const content = document.getElementById("overlay-content");

header.addEventListener("click", () => {
    if (content.style.display === "none") {
        content.style.display = "block";
        header.innerHTML = "Controls ▲";
    } else {
        content.style.display = "none";
        header.innerHTML = "Controls ▼";
    }
});

async function pause(){
    await fetch('/pause') 
}
document.getElementById("pauseButton").addEventListener("click", pause);

async function reset(){
    await fetch('/reset') 
    reload_bodies()
}
document.getElementById("resetButton").addEventListener("click", reset);


async function add(){
    await fetch('/add') 
    reload_bodies()
}
document.getElementById("addButton").addEventListener("click", add);

async function removeLast(){
    remove_body(body_info.length - 1)
    reload_bodies()
}
document.getElementById("removeButton").addEventListener("click", removeLast);


async function wind(){
fetch('/wind', {
    method: 'POST',  
    credentials: 'include',
    headers: {
    'Content-Type': 'application/json',  
    "Accept": "application/json"
    },
body: JSON.stringify({ timestep: document.getElementById("windTimestep").value}) 
})

    body_info.forEach(info => {
        destroy(info['sphere'])
        
    })
    body_info = await setup()

}
document.getElementById("windButton").addEventListener("click", wind);
