// grid.js

import * as THREE from 'three';

export const gridSize = 100;
const gridDivisions = 10;

export function setupGridAndLabels(scene) {
    // base
    const base = new THREE.GridHelper(gridSize, 1, 0x000000, 0x000000);
    scene.add(base);

    // wall
    const halfGridSize = gridSize / 2
    const baseVertex = [
        [-halfGridSize, 0, -halfGridSize],
        [halfGridSize, 0, -halfGridSize],
        [halfGridSize, 0, halfGridSize],
        [-halfGridSize, 0, halfGridSize],
    ];

    baseVertex.forEach(([x, y, z]) => {
            const line = new THREE.Line(
                new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(x, y, z),
                    new THREE.Vector3(x, y + gridSize, z)
                ]), 
                new THREE.LineBasicMaterial({ color: 0x000000 })
            );
            scene.add(line);
    });

    // 軸ラベル作成関数
    const fontSize = 128;
    const canvasSize = 256;

    function createTextSprite(text) {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = canvasSize;
        const context = canvas.getContext('2d');
        context.font = `${fontSize}px Arial`;
        context.fillStyle = 'black';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvasSize / 2, canvasSize / 2);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(gridSize * 0.05, gridSize * 0.05, gridSize * 0.05);
        return sprite;
    }

    // x axis
    for (let x = -halfGridSize; x <= halfGridSize; x += gridSize / gridDivisions) {
        // Line
        const y = 0;
        const z = halfGridSize;
        const line = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(x, y, z),
                new THREE.Vector3(x, y + gridDivisions / 4, z - gridDivisions / 4)
            ]),
            new THREE.LineBasicMaterial({ color: 0x000000 })
        );
        scene.add(line);
        
        // Text
        const text = createTextSprite(`${x}`);
        text.position.set(x, y - gridDivisions / 2, z + gridDivisions / 2);
        scene.add(text);
    }
    const xText = createTextSprite('x');
    xText.position.set(0, -gridDivisions, halfGridSize + gridDivisions)
    scene.add(xText)

    // y axis
    for (let y = 0; y <= gridSize; y += gridSize / gridDivisions) {
        // Line
        const x = -halfGridSize;
        const z = halfGridSize;
        const line = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(x, y, z),
                new THREE.Vector3(x + gridDivisions / 4, y, z - gridDivisions / 4)
            ]),
            new THREE.LineBasicMaterial({ color: 0x000000 })
        );
        scene.add(line);

        // Text
        const text = createTextSprite(`${y}`);
        text.position.set(x - gridDivisions / 2, y, z + gridDivisions / 2);
        scene.add(text);
    }
    const yText = createTextSprite('y');
    yText.position.set(-halfGridSize - gridDivisions, halfGridSize, halfGridSize + gridDivisions)
    scene.add(yText)

    // z axis
    for (let z = -halfGridSize; z <= halfGridSize; z += gridSize / gridDivisions) {
        // Line
        const y = 0;
        const x = halfGridSize;
        const line = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(x, y, z),
                new THREE.Vector3(x - gridDivisions / 4, y + gridDivisions / 4, z)
            ]),
            new THREE.LineBasicMaterial({ color: 0x000000 })
        );
        scene.add(line);

        // Text
        const text = createTextSprite(`${z}`);
        text.position.set(x + gridDivisions / 2, y - gridDivisions / 2, z);
        scene.add(text)
    }
    const zText = createTextSprite('z');
    zText.position.set(halfGridSize + gridDivisions, -gridDivisions, 0)
    scene.add(zText)
}