    import * as THREE from "three"
    import { OrbitControls } from "https://unpkg.com/three@0.112/examples/jsm/controls/OrbitControls.js";

    //Screen setup shit

    const W = window.innerWidth;
    const H = window.innerHeight;
    const renderer = new THREE.WebGLRenderer(); //antialias helps blend colors ig

    renderer.setSize(W, H);
    document.getElementById("renderer").appendChild(renderer.domElement) 

    //takes fov, aspect, near, far
    const fov = 75 //in degrees
    const aspect = W / H //aspect ratio
    const near = 0.1 //anything too close is not rendered
    const far = 1000000 //anything too far is not rendered either

    const cam = new THREE.PerspectiveCamera(fov, aspect, near, far)
    cam.position.z = 2;
    const scene = new THREE.Scene(); //adds the scene ig

    const controls = new OrbitControls(cam, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.03; 
    
    const loader = new THREE.CubeTextureLoader();
    loader.setPath("/static/textures/");
    const bg = loader.load([
        'existentialdread.jpg','existentialdread.jpg','existentialdread.jpg','existentialdread.jpg','existentialdread.jpg','existentialdread.jpg'
    ]);
    // const bg = new THREE.MeshBasicMaterial({envMap : textureCube})
    scene.background = bg

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // color, intensity
    scene.add(ambientLight)

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
    //Actual rendering/getting of objects



    //Initial setup/info of bodies
    let body_info = []
    await fetch('/get_body_info').then(response => { //await functions depending on what is returned: promise -> waits. normal val -> doesnt
        return response.json(); 
    }).then(data =>{
        body_info = data
    }
    )

    body_info.forEach(body => {
        body['trail'] = []
        //creation and addition of body to scene
        const geometry = new THREE.SphereGeometry( body['r'], 32, 16 );
        const material = new THREE.MeshBasicMaterial( { color: body['c'] } );
        const sphere = new THREE.Mesh( geometry, material );
        body['sphere'] = sphere
        body['highlighted'] = false;
        scene.add( sphere );

    });

    function update_bodies(coords) {
        // console.log("coords", coords)
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
            latestCoords.forEach(coord => {
            coord.x =  coord.x /100;
            coord.y =  coord.y /100;
            coord.z =  coord.z /100;
            });
   
        }

    let prevtrails = []

    //Animation
    function animate(t=0){
                if (latestCoords) {
                    // Update trails
                    for(let i = 0; i < body_info.length; i++){
                        // console.log(body_info[i])
                        body_info[i]['trail'].push({x:  latestCoords[i].x, y: latestCoords[i].y, z : latestCoords[i].z })
                        if (body_info[i]['trail'].length > MAX_TRAIL) body_info[i]['trail'].shift(); 

                    }
                    
                    update_bodies(latestCoords)


                    // Draw trails
                    const drawTrail = (trail, color) => {
                        if (trail.length < 2) return;
                        ctx.beginPath();
                        ctx.moveTo(trail[0].x, trail[0].y);
                        for (let i = 1; i < trail.length; i++) {
                            ctx.lineTo(trail[i].x, trail[i].y);
                        }
                        ctx.strokeStyle = color;
                        ctx.lineWidth = 1.25;
                        ctx.stroke();
                    };

                    prevtrails.forEach(trail=>{
                        scene.remove(trail)
                        trail.geometry.dispose();
                        trail.material.dispose();
                    })

                    body_info.forEach(info => {
                        const mat = new THREE.LineBasicMaterial({color: info['c']})
                        const geo = new THREE.BufferGeometry().setFromPoints(info['trail'] )
                        const line = new THREE.Line(geo, mat)
                        scene.add(line)
                        prevtrails.push(line)
                    });
                }

        requestAnimationFrame(animate);
        renderer.render(scene, cam) 
        controls.update()
    }
    setInterval(pollCoords, 50);

    animate();


