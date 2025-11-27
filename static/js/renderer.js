import * as THREE from "three"
import { OrbitControls } from "https://unpkg.com/three@0.112/examples/jsm/controls/OrbitControls.js";
import { InteractionManager } from "./libs/three.interactive.js";

//globalsish
let prevtrails = []
let paused = false;
let notupdated = true;
let shouldFollow = true;

//rendere setup
const W = window.innerWidth;
const H = window.innerHeight;
const renderer = new THREE.WebGLRenderer(); //antialias helps blend colors ig
renderer.setSize(W, H);
document.getElementById("renderer").appendChild(renderer.domElement) 
document.getElementById('closebtn').onclick = closenav_and_dehighlight

document.querySelectorAll(".bodyinput")
    .forEach(group => group.addEventListener("input", onEdit));


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
    await fetch('/get_all_body_info').then(response => { //await functions depending on what is returned: promise -> waits. normal val -> doesnt
        return response.json(); 
    }).then(data =>{
        binfo = data
    }
    )

    binfo.forEach(body => {
        body['trail'] = []
        const geometry = new THREE.SphereGeometry( body['r'], 32, 16 );
        const material = new THREE.MeshBasicMaterial( { color: `rgb(${body['c'][0]},${body['c'][1]},${body['c'][2]})`} );
        const sphere = new THREE.Mesh( geometry, material );
        body['sphere'] = sphere
        body['highlighted'] = false;
        scene.add(sphere);
        console.log(sphere)
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
    if (!keep_trails && prevtrails != null){
        prevtrails.forEach(trail=>{
                destroy(trail)
            })
        // resetTrails = true;
    }
    for (let i = 0; i < body_info.length; i++) {

    body_info[i]['sphere'].position.x =  body_info[i].x[0] /100
    body_info[i]['sphere'].position.y =body_info[i].x[1] /100
    body_info[i]['sphere'].position.z = body_info[i].x[2]  /100
}
}

//updates (movemetn)
function update_bodies(coords, scaler = 1) {
    for (let i = 0; i < coords.length; i++) {

        body_info[i]['sphere'].position.x = coords[i].x /scaler
        body_info[i]['sphere'].position.y = coords[i].y/scaler
        body_info[i]['sphere'].position.z = coords[i].z /scaler

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


//UI

//nav functions
function openNav() {

  document.getElementById("mySidebar").style.width = "250px";
  document.getElementById("renderer").style.marginLeft = "300px";
}

function closeNav() {
  document.getElementById("mySidebar").style.width = "0";
  document.getElementById("renderer").style.marginLeft= "0";
}

//Highlights

let curhighlighted = null;
let curhighlightedidx = -1;
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
    document.getElementById("bodyinfoheader").textContent = `Body ${idx}`

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
curhighlightedidx = idx;

}

function closenav_and_dehighlight(){
    highlight(curhighlightedidx)
}

async function updateValues(){
    if (curhighlighted == null){
        return;
    }

    let curhighdata = null
    // should update
    await fetch('/get_one_body_info', {
        method: 'POST',  
        credentials: 'include',
        headers: {
        'Content-Type': 'application/json',  
        "Accept": "application/json"
        },
    body: JSON.stringify({ "index": curhighlightedidx}) 
    }).then(response => { 
        return response.json(); 
    }).then(data =>{
        curhighdata = data
    }
    )
    // console.log("a", curhighdata['a'])
    let i = 0;
    document.querySelectorAll(".x-group")
        .forEach(group => {
            group.value = curhighdata['x'][i]
        i++;});
    i = 0
   document.querySelectorAll(".v-group")
        .forEach(group => {
            group.value = curhighdata['v'][i]
        i++;});
    i = 0
    document.querySelectorAll(".a-group")
        .forEach(group => {
            group.value = curhighdata['a'][i]
        i++;});
    i = 0 
    document.querySelectorAll(".c-group")
        .forEach(group => {
            group.value = curhighdata['c'][i]
        i++;});
  document.getElementById("mass").value= curhighdata['m'];
    document.getElementById("radius").value= curhighdata['r'];


}


function rgbToHex(r, g, b) {
  let hexR = r.toString(16);
  let hexG = g.toString(16);
  let hexB = b.toString(16);

  if (hexR.length === 1) {
    hexR = "0" + hexR;
  }
  if (hexG.length === 1) {
    hexG = "0" + hexG;
  }
  if (hexB.length === 1) {
    hexB = "0" + hexB;
  }

  return "#" + hexR + hexG + hexB;
}



//Editing properties
async function onEdit(e) {
    if (!paused) {
        paused = true;
        await fetch('/pause');
    }
    fetch('/update', {
        method: 'POST',  
        credentials: 'include',
        headers: {
        'Content-Type': 'application/json',  
        "Accept": "application/json"
        },
    body: JSON.stringify( {'idx' : curhighlightedidx, 
        'r' : document.getElementById("radius").value ,
        'm' : document.getElementById("radius").value ,

        'x' : [document.getElementById("pos-x").value , document.getElementById("pos-y").value , document.getElementById("pos-z").value ] ,
        'v' : [document.getElementById("vel-x").value , document.getElementById("vel-y").value , document.getElementById("vel-z").value ] ,
        'a' : [document.getElementById("acc-x").value , document.getElementById("acc-y").value , document.getElementById("acc-z").value ] ,
        'c' : [document.getElementById("R").value , document.getElementById("G").value , document.getElementById("B").value ] 
    })
    })
    
    //cosmetic changes:
    let curr = body_info[curhighlightedidx]
    let newc = [document.getElementById("R").value , document.getElementById("G").value , document.getElementById("B").value ]
    destroy(curr['sphere'])
    const geometry = new THREE.SphereGeometry( parseFloat(document.getElementById("radius").value), 32, 16 );
    const material = new THREE.MeshBasicMaterial( { color: `rgb(${newc[0]},${newc[1]},${newc[2]})`} );
    const sphere = new THREE.Mesh( geometry, material );
    scene.add(sphere)
    curr['sphere'] = sphere
    
    const geo = new THREE.SphereGeometry(curr['r'] * 1.2, 32, 16)
    let mat2 = new THREE.MeshBasicMaterial({
        color:  `rgb(${newc[0]},${newc[1]},${newc[2]})`, 
        transparent: true,
        opacity: 0.5,
    })

    curr['highlighted_mesh'] = new THREE.Mesh(geo, mat2); 
    curr['sphere'].add(curr['highlighted_mesh']);


    curr['sphere'].position.x = document.getElementById("pos-x").value  / 100
    curr['sphere'].position.y = document.getElementById("pos-y").value/ 100
    curr['sphere'].position.z = document.getElementById("pos-z").value / 100
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
    if (paused){
    await fetch('/unpause');
    notupdated = true;
    }else{
    await fetch('/pause');
    }
    paused = ! paused;
}
document.getElementById("pauseButton").addEventListener("click", pause);

async function reset(){
    await fetch('/reset') 
    reload_bodies()
}
document.getElementById("resetButton").addEventListener("click", reset);


async function toggleLook(){
    if (shouldFollow){
    
        if (curhighlighted != null){

        cam.position.set(body_info[curhighlightedidx]['sphere'].position.x, body_info[curhighlightedidx]['sphere'].position.y, body_info[curhighlightedidx]['sphere'].position.z); 

        }else{
        if (body_info.length > 0){


        cam.position.set(body_info[0]['sphere'].position.x, body_info[0]['sphere'].position.y, body_info[0]['sphere'].position.z ); 
        }
        
    }}
    shouldFollow = !shouldFollow



}
document.getElementById("followButton").addEventListener("click", toggleLook);



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

async function getNext(){
    highlight((curhighlightedidx + 1) % body_info.length)
}
document.getElementById("nextBall").addEventListener("click", getNext);


async function getPrev(){
    highlight(curhighlightedidx -1 +  body_info.length) % body_info.length
    
}
document.getElementById("prevBall").addEventListener("click", getPrev);


async function clippAcceleration(){ 
    await fetch('/clipAcc').then(response => { //await functions depending on what is returned: promise -> waits. normal val -> doesnt
        return response.json(); 
    }).then(data =>{
        console.log(data)
        if(data['clipped']){
            document.getElementById("accClip").textContent = "Acceleration Clipping: On"
        }else{
        document.getElementById("accClip").textContent = "Acceleration Clipping: Off"
        }
    }
    )
}
document.getElementById("accClip").addEventListener("click", clippAcceleration);

async function tpCam(){
    
    if (curhighlighted != null){

    cam.position.lerp(body_info[curhighlightedidx]['sphere'].position.x, body_info[curhighlightedidx]['sphere'].position.y, body_info[curhighlightedidx]['sphere'].position.z); 

    }else{
    if (body_info.length > 0){
    cam.position.lerp(body_info[0]['sphere'].position.x, body_info[0]['sphere'].position.y, body_info[0]['sphere'].position.z ); 
    }
    
} 

}
document.getElementById("tpCam").addEventListener("click", tpCam);

async function highlighsmth(){
    if (body_info.length > 0){
    highlight(0)

    }
}
document.getElementById("openButton").addEventListener("click", highlighsmth);



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

let lastupdate = 0
function animate(t=0){
            try{

            if (latestCoords != null) {
                // Update trails
       
                for(let i = 0; i < body_info.length; i++){
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
    if (curhighlighted != null && (lastupdate > 30 && !paused || (paused && notupdated))){
        updateValues();
        lastupdate = 0;
        notupdated = false;
    }
    if(shouldFollow){
        
        if (curhighlighted != null){

        cam.lookAt(body_info[curhighlightedidx]['sphere'].position); 

        }else{
        if (body_info.length > 0){


        cam.lookAt(body_info[0]['sphere'].position); 
        }

        }
    }
    lastupdate++;
    requestAnimationFrame(animate);
    renderer.render(scene, cam) 
    controls.update()

}
setInterval(pollCoords, 75);

animate();