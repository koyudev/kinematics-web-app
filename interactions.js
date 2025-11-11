// interactions.js

import * as THREE from 'three';

export function setupInteractions(scene, camera, renderer, gridSize, positioning) {
    const mouse = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();

    const points = [];

    // Camera
    const cameraPosition = camera.position.clone();
    const cameraLookAt = new THREE.Vector3(0, 50, 0); // 元の注視点

    // Cursor Text
    const cursorText = document.createElement('div');
    cursorText.style.color = '#000';
    cursorText.style.padding = '4px 8px';
    cursorText.style.position = 'absolute';
    cursorText.style.top = '10px';
    cursorText.style.left = '50%';
    cursorText.style.transform = 'translate(-50%, 0)';
    cursorText.innerText = 'X = 0, Y = 0, Z = 0';
    document.body.appendChild(cursorText);
    cursorText.style.display = 'none';

    // Points Text
    const pointsText = document.createElement('div');
    pointsText.style.color = '#000';
    pointsText.style.background = 'rgba(255, 255, 255, 0.8)';
    pointsText.style.padding = '4px 8px';
    pointsText.style.fontSize = '12px';
    pointsText.style.pointerEvents = 'none';
    document.getElementById('ui-panel-top').appendChild(pointsText)
    pointsText.style.display = 'block';
    pointsText.innerText = `Points`;

    // Point
    const point = new THREE.Vector3();

    // Temprary Plane
    const planeGeometry = new THREE.PlaneGeometry(gridSize, gridSize);
    const planeMaterial = new THREE.MeshBasicMaterial({ color: 0xdddddd, opacity: 0.3, transparent: true });
    const tempPlane = new THREE.Mesh(planeGeometry, planeMaterial);
    tempPlane.position.y = gridSize / 2;
    scene.add(tempPlane);
    tempPlane.visible = false
    // Temporary Sphere
    const tempSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    scene.add(tempSphere)
    tempSphere.visible = false
    // Temporary Line 
    const tempLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
        new THREE.LineBasicMaterial({ color: 0x00ff00 })
    );
    scene.add(tempLine);
    tempLine.visible = false;

    // Create Button
    const createButton = document.createElement('button');
    createButton.innerText = '作成';
    createButton.style.marginTop = '10px';
    createButton.style.width = '100%';
    document.getElementById('ui-panel-bottom').appendChild(createButton);

    createButton.addEventListener('click', () => {
        if (positioning.plain == null) {
            positioning.plain = 'XY';
            // Temporary
            tempPlane.rotation.y = 0;
            tempPlane.position.x = 0;
            tempPlane.position.z = 0;
            tempPlane.visible = true;
            tempSphere.visible = true;
            tempLine.visible = true;
            cursorText.style.display = 'block';
            
            // Camera
            camera.position.set(0, 50, 100); // 正面ビュー
            camera.lookAt(0, 50, 0);

            // Button
            createButton.innerText = '完了';
        } else {
            positioning.plain = null;
            // Temporary
            tempPlane.visible = false;
            tempSphere.visible = false;
            tempLine.visible = false;
            cursorText.style.display = 'none';

            // Camera
            camera.position.set(80, 50, 140); // 正面ビュー
            camera.lookAt(0, 50, 0);

            // Button
            createButton.innerText = '作成';
        }
        
    });

    // On Mousemove
    renderer.domElement.addEventListener('mousemove', (event) => {
        if (!positioning.plain) return;

        // Point
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(tempPlane);
        if (!intersects.length) return;

        switch(positioning.plain) {
            case 'XY':
                point.x = intersects[0].point.x;
                point.y = intersects[0].point.y;
                break;
            case 'YZ':
                point.z = intersects[0].point.z;
                break;
        }
        
        // Text
        let text = `X = ${point.x.toFixed(2)}, Y = ${point.y.toFixed(2)}, Z = ${point.z.toFixed(2)}\n`;
        cursorText.innerText = text;

        // Sphere
        tempSphere.position.copy(point);

        // Line
        if (points.length > 0) {
            tempLine.geometry.setFromPoints([points[points.length - 1], point]);
        } 
    });

    // On Click
    renderer.domElement.addEventListener('click', (event) => {
        if (!positioning.plain) return;

        // Point
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(tempPlane);
        if (!intersects.length) return;



        switch(positioning.plain) {
            case 'XY':
                // To YZ Plain
                point.x = intersects[0].point.x;
                point.y = intersects[0].point.y;
                positioning.plain = 'YZ'
                tempPlane.rotation.y = Math.PI / 2;
                tempPlane.position.x = point.x
                tempPlane.position.z = 0
                backToView();
                break;
            case 'YZ':
                point.z = intersects[0].point.z;
                points.push(point.clone());
                let text = `Points\n`
                points.forEach((points, i) => {
                    text += `${i + 1}: (${points.x.toFixed(2)}, ${points.y.toFixed(2)}, ${points.z.toFixed(2)})\n`;
                });
                pointsText.innerText = text

                // Sphere
                const sphere = new THREE.Mesh(
                    new THREE.SphereGeometry(0.4, 16, 16),
                    new THREE.MeshBasicMaterial({ color: 0xff0000 })
                );
                sphere.position.copy(point);
                scene.add(sphere);

                // Line
                if (points.length > 1) {
                    const line = new THREE.Line(
                        new THREE.BufferGeometry().setFromPoints([points[points.length - 2], points[points.length - 1]]),
                        new THREE.LineBasicMaterial({ color: 0x000000 })
                    );
                    scene.add(line); 
                }
                
                // To XY Plain
                tempPlane.rotation.y = 0;
                tempPlane.position.x = 0
                tempPlane.position.z = point.z
                startPlacingPoint()
                positioning.plain = 'XY'
                break;
        }
    });

    function startPlacingPoint() {
        camera.position.set(0, 50, 100); // XY 平面正面
        camera.lookAt(0, 50, 0);
    }

    function backToView() {
        camera.position.copy(cameraPosition);
        camera.lookAt(cameraLookAt);
    }

    return { points, startPlacingPoint };
}