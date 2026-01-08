import * as THREE from 'three';

export function getPointer( event: MouseEvent, mount: HTMLDivElement ) {
    const rect = mount.getBoundingClientRect();
    const pointer = new THREE.Vector2();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = - ((event.clientY - rect.top) / rect.height) * 2 + 1;
    return pointer;
}

// ---- raycast ----
export function raycast(
    raycaster: THREE.Raycaster,
    camera: THREE.Camera,
    pointer: THREE.Vector2,
    plane: THREE.Plane,
): THREE.Vector3 {
    raycaster.setFromCamera(pointer, camera);

    const result = new THREE.Vector3();

    raycaster.ray.intersectPlane(plane, result);

    return result;
}

// ---- pick mesh ----
export function pickMesh(
    raycaster: THREE.Raycaster,
    camera: THREE.Camera,
    pointer: THREE.Vector2,
    meshes: THREE.Mesh[],
): number | null {
    raycaster.setFromCamera(pointer, camera);

    const intersects = raycaster.intersectObjects(
        meshes,
        false
    );

    if (intersects.length === 0) return null;
    
    const index = meshes.indexOf(intersects[0].object as THREE.Mesh);

    if (index === -1) return null;
    return index;
}