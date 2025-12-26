import './threecanvas.css';
import React, { useImperativeHandle, forwardRef, useRef, useEffect, useState, use } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer';
import { 
    initializeThreeScene,
    resizeThreeCanvas, 
    initializeOrbitControls, 
    registerControlsShortcuts, 
    startAnimationLoop, 
    cleanupThreeScene, 
    addAxesFrame, Bounds
} from './threecanvasUtils';

export interface ThreeCanvasProps {
    roboPoints: [number, number, number][];
    taskPoints: [number, number, number][];
    target: "robo" | "task" | null;
    inputPoint: [number, number, number];
    editorMode: boolean;
    onInputPointChange: (point: [number, number, number]) => void;
    onInputPointConfirm: () => void;
}

export function ThreeCanvas({ roboPoints, taskPoints, target, inputPoint, editorMode, onInputPointChange, onInputPointConfirm }: ThreeCanvasProps) {
    // === React refs ===
    const mountRef = useRef<HTMLDivElement>(null);

    const bounds: Bounds = {
        xMin: -50, xMax: 50,
        yMin: 0, yMax: 100,
        zMin: -50, zMax: 50
    };
    const unit: number = 10;

    // === Three.js ローカル変数 ===
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
    const orthoViewSize = 100;
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const labelRendererRef = useRef<CSS2DRenderer | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);

    // === 編集ステート ===
    const previewMeshRef = useRef<THREE.Mesh | null>(null);
    const previewLineRef = useRef<THREE.Line | null>(null);

    const roboMeshesRef = useRef<THREE.Mesh[]>([]);
    const roboLineRef = useRef<THREE.Line | null>(null);

    const taskMeshesRef = useRef<THREE.Mesh[]>([]);

    const [stage, setStage] = useState<"xy" | "yz" | null>(null);
    const xyPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0));
    const yzPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(1, 0, 0), 0))

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // ========= カメラ切り替え ==========
    // ========= 通常モードのカメラ ==========
    function resetCameraDefault() {
        cameraRef.current?.position.set(100, 100, 150);
        controlsRef.current?.target.set(0, 50, 0);
    }
    function setCameraForXY() {
        cameraRef.current?.position.set(0, 0, 300);
        cameraRef.current?.lookAt(0, 0, 0);
    }

    function setCameraForYZ(x: number) {
        cameraRef.current?.position.set(300, 0, 0);
        cameraRef.current?.lookAt(x, 0, 0);
    }

    // ========= レイキャスト ==========
    function raycastToPlane(e: MouseEvent, plane: THREE.Plane): THREE.Vector3 {
        if (!mountRef.current) return new THREE.Vector3();

        const rect = mountRef.current.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, cameraRef.current!);
        const pos = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, pos);
        return pos;
    }

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

        //  ---- init Three.js ----
        const { scene, camera, renderer, labelRenderer } = initializeThreeScene(mount);
        sceneRef.current = scene;
        cameraRef.current = camera;
        rendererRef.current = renderer;
        labelRendererRef.current = labelRenderer;

        resizeThreeCanvas(mount, camera, renderer, labelRenderer, orthoViewSize);

        // ---- init Controls ----
        const controls = initializeOrbitControls(camera, renderer);
        controlsRef.current = controls;

        const unregisterControlsShortcuts = registerControlsShortcuts(controls);

        // カメラ初期位置設定
        resetCameraDefault();

        // 座標枠生成
        addAxesFrame(scene, bounds, unit);

        // リサイズ対応
        const onResize = () => {
            resizeThreeCanvas(mount, camera, renderer, labelRenderer, orthoViewSize);
        }
        window.addEventListener('resize', onResize);
        
        // アニメーション
        startAnimationLoop(scene, camera, renderer, labelRenderer, controls);

        // cleanup
        return () => {
            cleanupThreeScene(mount, renderer, labelRenderer);
            unregisterControlsShortcuts();
            window.removeEventListener('resize', onResize);
        };
    }, []);

    // ==== editorMode の切り替え ====
    useEffect(() => {
        const scene = sceneRef.current;
        const camera = cameraRef.current;
        if (!scene || !camera) return;

        if (!editorMode) {
            // 編集終了
            setStage(null);
            if (previewMeshRef.current) scene.remove(previewMeshRef.current);
            previewMeshRef.current = null;
            return;
        }
        // 編集開始
        setStage("xy");
        const previewMesh = new THREE.Mesh(
            new THREE.SphereGeometry(10, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0x00ff00 })
        );
        scene.add(previewMesh);
        previewMeshRef.current = previewMesh;

        camera.position.set(0, 0, 300);
        camera.lookAt(0, 0, 0);
    }, [editorMode]);

    // ========== マウスイベント ==========
    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

        function onMouseMove(e: MouseEvent) {
            if (!editorMode) return;

            if (stage === "xy") {
                const pos = raycastToPlane(e, xyPlaneRef.current);
                onInputPointChange([
                    pos.x, pos.y, pos.z
                ]);
            }
            if (stage === "yz") {
                const pos = raycastToPlane(e, yzPlaneRef.current);
                onInputPointChange([
                    inputPoint[0], inputPoint[1], pos.z
                ]);
            }

            
        }

        mount.addEventListener("mousemove", onMouseMove);
        return () => mount.removeEventListener("mousemove", onMouseMove);
    }, [editorMode, stage]);

    // ==== クリック ====
    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

        function onClick() {
            if (!editorMode) return;

            if (stage === "xy") {
                setStage("yz");
                yzPlaneRef.current.constant = -inputPoint[0];
                cameraRef.current?.position.set(300, 0, 0);
                cameraRef.current?.lookAt(inputPoint[0], 0, 0);
            }
            if (stage === "yz") {
                onInputPointConfirm();
            }
        }
        mount.addEventListener("click", onClick);
        return () => mount.removeEventListener("click", onClick);
    }, [editorMode, stage]);

    // ========= 編集点の同期 ==========
    useEffect(() => {
        const previewMesh = previewMeshRef.current;
        if (!editorMode || !previewMesh) return;

        previewMesh.position.set(inputPoint[0], inputPoint[1], inputPoint[2]);

        if (target === "robo") {
            const meshes = roboMeshesRef.current;
            if (meshes.length === 0) return;

            const lastMesh = meshes[meshes.length - 1];
            const a = lastMesh.position;
            const b = inputPoint;

            const geometry = new THREE.BufferGeometry().setFromPoints([
                a.clone(),
                new THREE.Vector3(b[0], b[1], b[2])
            ]);
            if (!previewLineRef.current) {
                const material = new THREE.LineBasicMaterial({ color: 0x00aa00 });
                const line = new THREE.Line(geometry, material);
                sceneRef.current?.add(line);
                previewLineRef.current = line;
            } else {
                previewLineRef.current.geometry.dispose();
                previewLineRef.current.geometry = geometry;
            }
        }
    }, [inputPoint]);

    // ========= 点の同期 ==========
    useEffect(() => {
        if (!sceneRef.current) return;

        const meshes = roboMeshesRef.current;

        // 追加が必要な点
        while (meshes.length < roboPoints.length) {
            const geometry = new THREE.SphereGeometry(0.2, 16, 16);
            const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            const mesh = new THREE.Mesh(geometry, material);
            sceneRef.current.add(mesh);
            meshes.push(mesh);
        }
        
        // 削除が必要な点
        while (meshes.length > roboPoints.length) {
            const removed = meshes.pop();
            if (removed) sceneRef.current.remove(removed);
        }

        // 座標の同期
        roboPoints.forEach((p, i) => {
            meshes[i].position.set(p[0], p[1], p[2]);
        });
        
    }, [roboPoints]);

    useEffect(() => {
        const scene = sceneRef.current;
        if (!scene) return;

        // 既存の線を削除
        if (roboLineRef.current) {
            scene.remove(roboLineRef.current);
            roboLineRef.current.geometry.dispose();
            roboLineRef.current = null;
        }

        if (roboPoints.length < 2) return;

        // Vector3 配列に変換
        const vertices = roboPoints.map(
            p => new THREE.Vector3(p[0], p[1], p[2])
        );

        const geometry = new THREE.BufferGeometry().setFromPoints(vertices);
        const material = new THREE.LineBasicMaterial({
            color: 0x0000ff,
            linewidth: 2 // ※ WebGL ではほぼ無効
        });

        const line = new THREE.Line(geometry, material);
        scene.add(line);
        roboLineRef.current = line;
    }, [roboPoints]);

    // ========= 点の同期 ==========
    useEffect(() => {
        if (!sceneRef.current) return;

        const meshes = taskMeshesRef.current;

        // 追加が必要な点
        while (meshes.length < taskPoints.length) {
            const geometry = new THREE.SphereGeometry(0.2, 16, 16);
            const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            const mesh = new THREE.Mesh(geometry, material);
            sceneRef.current.add(mesh);
            meshes.push(mesh);
        }
        
        // 削除が必要な点
        while (meshes.length > taskPoints.length) {
            const removed = meshes.pop();
            if (removed) sceneRef.current.remove(removed);
        }

        // 座標の同期
        taskPoints.forEach((p, i) => {
            meshes[i].position.set(p[0], p[1], p[2]);
        });
        
    }, [taskPoints]);

    return (
        <div ref={mountRef} id="three-canvas"/>
    );
}