// threecanvasUtils.ts

import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export const initializeThreeScene = (mount: HTMLElement) => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    const camera = new THREE.OrthographicCamera(0, 0, 0, 0, 0.1, 1000);

    const renderer = new THREE.WebGLRenderer();
    mount.appendChild(renderer.domElement);

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.domElement.classList.add('label-renderer');
    mount.appendChild(labelRenderer.domElement);

    return {
        scene,
        camera,
        renderer,
        labelRenderer
    };
}

export const resizeThreeCanvas = (
    mount: HTMLElement,
    camera: THREE.OrthographicCamera, 
    renderer: THREE.WebGLRenderer, 
    labelRenderer: CSS2DRenderer, 
    orthoViewSize: number = 500
) => {
    const width = mount.clientWidth;
    const height = mount.clientHeight;
    const aspect = width / height;

    if (aspect >= 1) {
        camera.top = orthoViewSize;
        camera.bottom = -orthoViewSize;
        camera.left = -orthoViewSize * aspect;
        camera.right = orthoViewSize * aspect;
    } else {
        camera.left = -orthoViewSize;
        camera.right = orthoViewSize;
        camera.top = orthoViewSize / aspect;
        camera.bottom = -orthoViewSize / aspect;
    }

    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    labelRenderer.setSize(width, height);
}

export const cleanupThreeScene = (mount: HTMLElement, renderer: THREE.WebGLRenderer, labelRenderer: CSS2DRenderer) => {
    return () => {
        mount.removeChild(renderer.domElement);
        mount.removeChild(labelRenderer.domElement);
    };
}

export const initializeOrbitControls = (camera: THREE.Camera, renderer: THREE.WebGLRenderer) => {
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.mouseButtons = {
        LEFT: null,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE,
    };
    controls.enableDamping = false;
    return controls;
}

export const registerControlsShortcuts = (controls: OrbitControls) => {
    const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Control") {
            controls.enableRotate = false;
            controls.enablePan = true;
        }
    };
    const onKeyUp = (e: KeyboardEvent) => {
        if (e.key === "Control") {
            controls.enableRotate = true;
            controls.enablePan = false;
        }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
    };
}

export const startAnimationLoop = (
    scene: THREE.Scene, 
    camera: THREE.Camera, 
    renderer: THREE.WebGLRenderer, 
    labelRenderer: CSS2DRenderer, 
    controls: OrbitControls
) => {
    const animate = () => {
        controls.update();
        renderer.render(scene, camera);
        labelRenderer.render(scene, camera);
        requestAnimationFrame(animate);
    };
    animate();
}

export type Bounds = {
    xMin: number, xMax: number,
    yMin: number, yMax: number,
    zMin: number, zMax: number
}

// 軸枠を追加
export function addAxesFrame(
    scene: THREE.Scene,
    bounds: Bounds,
    unit: number
) {
    const material = new THREE.LineBasicMaterial({ color: 0x000000 });

    // 頂点
    const frontTopLeft = new THREE.Vector3(bounds.xMin, bounds.yMax, bounds.zMax);
    const frontTopRight = new THREE.Vector3(bounds.xMax, bounds.yMax, bounds.zMax);
    const frontBottomLeft = new THREE.Vector3(bounds.xMin, bounds.yMin, bounds.zMax);
    const frontBottomRight = new THREE.Vector3(bounds.xMax, bounds.yMin, bounds.zMax);
    const backTopLeft = new THREE.Vector3(bounds.xMin, bounds.yMax, bounds.zMin);
    const backTopRight = new THREE.Vector3(bounds.xMax, bounds.yMax, bounds.zMin);
    const backBottomLeft = new THREE.Vector3(bounds.xMin, bounds.yMin, bounds.zMin);
    const backBottomRight = new THREE.Vector3(bounds.xMax, bounds.yMin, bounds.zMin);

    // 辺
    const edges = [
        // Front
        [frontTopLeft, frontBottomLeft], 
        [frontBottomRight, frontTopRight], 
        [frontBottomLeft, frontBottomRight], 
        // Back
        [backTopLeft, backBottomLeft], 
        [backBottomRight, backTopRight], 
        [backBottomLeft, backBottomRight], 
        // Sides
        [frontBottomLeft, backBottomLeft],
        [frontBottomRight, backBottomRight]
    ];

    // 辺を追加
    for (const [start, end] of edges) {
        const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
        const line = new THREE.Line(geometry, material);
        scene.add(line);
    }

    // 軸を追加
    addAxis(scene, bounds, unit, 'x');
    addAxis(scene, bounds, unit, 'y');
    addAxis(scene, bounds, unit, 'z');
}

// 軸を追加
function addAxis(
    scene: THREE.Scene,
    bounds: Bounds,
    unit: number,
    axis: 'x' | 'y' | 'z'
) {
    const gridlineMaterial = new THREE.LineBasicMaterial({ color: 0x888888 });

    const { xMin, xMax, yMin, yMax, zMin, zMax } = bounds;

    const start = axis === 'x' ? xMin : axis === 'y' ? yMin : zMin;
    const end   = axis === 'x' ? xMax : axis === 'y' ? yMax : zMax;

    const axisLabel = createLabel(axis.toUpperCase());
    if (axis === 'x') {
        axisLabel.position.set((xMin + xMax) / 2, yMin - 16, zMax + 16);
    } else if (axis === 'y') {
        axisLabel.position.set(xMin - 16, (yMin + yMax) / 2, zMax + 16);
    } else {
        axisLabel.position.set(xMax + 16, yMin - 16, (zMin + zMax) / 2);
    }
    scene.add(axisLabel);

    for (let axisValue = start; axisValue <= end; axisValue += unit) {
        let gridlineStart: THREE.Vector3;
        let gridlineEnd: THREE.Vector3;
        let lavelPosition: THREE.Vector3;

        if (axis === 'x') {
            gridlineStart = new THREE.Vector3(axisValue, yMin, zMax);
            gridlineEnd = new THREE.Vector3(axisValue, yMin + 2, zMax);
            lavelPosition = new THREE.Vector3(axisValue, yMin - 8, zMax + 8);
        } else if (axis === 'y') {
            gridlineStart = new THREE.Vector3(xMin, axisValue, zMax);
            gridlineEnd = new THREE.Vector3(xMin + 2, axisValue, zMax - 2);
            lavelPosition = new THREE.Vector3(xMin - 8, axisValue, zMax + 8);

        } else {
            gridlineStart = new THREE.Vector3(xMax, yMin, axisValue);
            gridlineEnd = new THREE.Vector3(xMax, yMin + 2, axisValue);
            lavelPosition = new THREE.Vector3(xMax + 8, yMin - 8, axisValue);
        }

        // gridline
        const gridlineGeometry = new THREE.BufferGeometry().setFromPoints([gridlineStart, gridlineEnd]);
        const gridline = new THREE.Line(gridlineGeometry, gridlineMaterial);
        scene.add(gridline);

        // label
        const label = createLabel(axisValue.toString());
        label.position.copy(lavelPosition);
        scene.add(label);
    }
}

export function createLabel(text: string) {
    const div = document.createElement('div');
    div.className = 'label';
    div.textContent = text;
    return new CSS2DObject(div);
}