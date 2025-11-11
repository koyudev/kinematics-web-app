// main.js

import * as THREE from 'three';
import { gridSize, setupGridAndLabels } from './grid.js';
import { setupInteractions } from './interactions.js';
import { setupLineLoader, setupExportButton } from './exporter.js';

// シーン・カメラ・レンダラーの初期化
export function initScene() {
    // Scene
    const scene = new THREE.Scene();

    // Camera
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 200;

    const camera = new THREE.OrthographicCamera(
        -frustumSize * aspect / 2,
        frustumSize * aspect / 2,
        frustumSize / 2,
        -frustumSize / 2,
        0.1,
        1000
    );
    camera.position.set(70, 70, 160);
    camera.lookAt(0, 50, 0);

    // Renderer
    const canvas = document.getElementById('three-canvas');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setClearColor(0xffffff);

    // Resize
    const resizeObserver = new ResizeObserver(() => {
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
    });
    resizeObserver.observe(canvas);

    // Status
    const positioning = { plain: null}

    return { scene, camera, renderer, positioning };
}

// アニメーションループ
export function animate(renderer, scene, camera) {
    function loop() {
        requestAnimationFrame(loop);
        renderer.render(scene, camera);
    }
    loop();
}

// エントリーポイント（ここで全て呼ぶ）
function main() {
    const { scene, camera, renderer, positioning } = initScene();

    // グリッド・ラベル設置
    setupGridAndLabels(scene);

    // マウス操作のセットアップ
    const { points } = setupInteractions(scene, camera, renderer, gridSize, positioning);

    // 線データの読み込みとエクスポートボタン設置
    setupLineLoader(scene);
    setupExportButton(scene, points);

    // アニメーション開始
    animate(renderer, scene, camera);
}

main();