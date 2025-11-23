    import * as THREE from "three"
    import { OrbitControls } from "https://unpkg.com/three@0.112/examples/jsm/controls/OrbitControls.js";

    //Screen setup shit

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

    const controls = new OrbitControls(cam, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.03; 



    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // color, intensity
    scene.add(ambientLight)

    const size = 10;
    const divisions = 10;
    const gridHelperXZ = new THREE.GridHelper( size, divisions );
    const gridHelperYZ = new THREE.GridHelper( size, divisions );
    // gridHelperYZ.rotation.z =

    const gridHelperXY = new THREE.GridHelper( size, divisions );


    scene.add( gridHelperXY );
    scene.add( gridHelperYZ );
    scene.add( gridHelperXZ );
    //Actual rendering/getting of objects

    //ig initial info:
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
        const geometry = new THREE.SphereGeometry( 0.2, 32, 16 );
        const material = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
        const sphere = new THREE.Mesh( geometry, material );
        body['sphere'] = sphere
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


    //Animation
    function animate(t=0){
                if (latestCoords) {
                    // Update trails
                    for(let i = 0; i < body_info.length; i++){
                        // console.log(body_info[i])
                        body_info[i]['trail'].push({x:  latestCoords[i].x, y: latestCoords[i].y })
                        if (body_info[i]['trail'].length > MAX_TRAIL) body_info[i]['trail'].shift(); 

                    }
                    
                    update_bodies(latestCoords)

                    // // Draw trails
                    // const drawTrail = (trail, color) => {
                    //     if (trail.length < 2) return;
                    //     ctx.beginPath();
                    //     ctx.moveTo(trail[0].x, trail[0].y);
                    //     for (let i = 1; i < trail.length; i++) {
                    //         ctx.lineTo(trail[i].x, trail[i].y);
                    //     }
                    //     ctx.strokeStyle = color;
                    //     ctx.lineWidth = 1.25;
                    //     ctx.stroke();
                    // };
                    // trails.forEach(trail => {
                    //     drawTrail(trail, '#1976d2')
                    // });
                }

        requestAnimationFrame(animate);
        renderer.render(scene, cam)
        controls.update()
    }
    setInterval(pollCoords, 50);

    animate();

    /*
    Other notes: Can also add things as children to other things so that they can like move together.
    */

