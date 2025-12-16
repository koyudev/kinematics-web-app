import './threecanvas.css';
import React, { useImperativeHandle, forwardRef, useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer';
import { buildAxisFrame } from '../../three/axisFrame';

export interface ThreeCanvasProps {
    roboPoints: [number, number, number][];
    taskPoints: [number, number, number][];
    editorMode: boolean;
    onInputPointChange: (point: [number, number, number]) => void;
    onPointComplete: (point: [number, number, number]) => void;
}

export function ThreeCanvas({ roboPoints, taskPoints, editorMode, onInputPointChange, onPointComplete }: ThreeCanvasProps) {
    // === React refs ===
    const mountRef = useRef<HTMLDivElement>(null);
    const meshesRef = useRef<THREE.Mesh[]>([]);

    // === Three.js ローカル変数 ===
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
    const orthoViewSize = 100;
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const labelRendererRef = useRef<CSS2DRenderer | null>(null);
    let controls: OrbitControls;

    const xBounds: [number, number] = [-50, 50];
    const yBounds: [number, number] = [0, 100];
    const zBounds: [number, number] = [-50, 50];
    const unit: number = 10;

    // === 編集ステート ===
    const xyPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0));
    const yzPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(1, 0, 0), 0))
    const [stage, setStage] = useState<"xy" | "yz" | null>(null);
    const tempPointRef = useRef<THREE.Vector3>(new THREE.Vector3());
    const previewMeshRef = useRef<THREE.Mesh | null>(null);
    const lineRef = useRef<THREE.Line | null>(null);
    const previewLineRef = useRef<THREE.Line | null>(null);
    
    function resizeThreeCanvas() {
        const mount = mountRef.current;
        const camera = cameraRef.current;
        const renderer = rendererRef.current;
        const labelRenderer = labelRendererRef.current;
        if (!mount || !camera || !renderer || !labelRenderer) return;

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

    // ========= カメラ切り替え ==========
    function setCameraForXY() {
        cameraRef.current?.position.set(0, 0, 300);
        cameraRef.current?.lookAt(0, 0, 0);
    }

    function setCameraForYZ(x: number) {
        cameraRef.current?.position.set(300, 0, 0);
        cameraRef.current?.lookAt(x, 0, 0);
    }

    // ========= レイキャスト ==========
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

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
        if (!mountRef.current) return;

        // シーン、カメラ、レンダラー
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xFFFFFF);
        sceneRef.current = scene;
        
        const camera = new THREE.OrthographicCamera(0, 0, 0, 0, 0.1, 1000);
        cameraRef.current = camera;

        rendererRef.current = new THREE.WebGLRenderer();
        mountRef.current.appendChild(rendererRef.current.domElement);

        labelRendererRef.current = new CSS2DRenderer();
        labelRendererRef.current.domElement.classList.add('label-renderer');
        mountRef.current.appendChild(labelRendererRef.current.domElement);

        resizeThreeCanvas();

        // 座標枠生成
        buildAxisFrame(scene, xBounds, yBounds, zBounds, unit);

        // OrbitControls
        controls = new OrbitControls(camera, rendererRef.current.domElement);
        controls.mouseButtons = {
            LEFT: null,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.ROTATE
        };
        controls.enableDamping = false;

        resetCameraDefault();
        
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

        // アニメーション
        const animate = () => {
            requestAnimationFrame(animate);
            controls.update();
            rendererRef.current!.render(scene, camera);
            labelRendererRef.current.render(scene, camera);
        };
        animate();

        // ★ リサイズ対応
        window.addEventListener('resize', resizeThreeCanvas);

        // cleanup
        return () => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
            window.removeEventListener('resize', resizeThreeCanvas);
            mountRef.current?.removeChild(renderer.domElement);
            mountRef.current?.removeChild(labelRenderer.domElement);
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
        function onMouseMove(e: MouseEvent) {
            const previewMesh = previewMeshRef.current;
            if (!editorMode || !previewMesh) return;
            const tempPoint = tempPointRef.current;

            if (stage === "xy") {
                const pos = raycastToPlane(e, xyPlaneRef.current);
                previewMesh.position.copy(pos);
                onInputPointChange([
                    pos.x, pos.y, pos.z
                ]);
            }

            if (stage === "yz") {
                console.log(tempPoint.x);
                yzPlaneRef.current.constant = -tempPoint.x;
                const pos = raycastToPlane(e, yzPlaneRef.current);
                previewMesh.position.set(tempPoint.x, pos.y, pos.z);
                onInputPointChange([
                    pos.x, pos.y, pos.z
                ]);

                const a = tempPointRef.current;
                const b = previewMesh.position;

                const geometry = new THREE.BufferGeometry().setFromPoints([
                    a.clone(),
                    b.clone()
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
        }

        window.addEventListener("mousemove", onMouseMove);
        return () => window.removeEventListener("mousemove", onMouseMove);
    }, [editorMode, stage]);

    // ==== クリック ====
    useEffect(() => {
        function onClick() {
            const previewMesh = previewMeshRef.current;
            if (!editorMode || !previewMesh) return;
            const tempPoint = tempPointRef.current;

            if (stage === "xy") {
                tempPoint.copy(previewMesh.position);
                console.log(previewMesh.position);
                setStage("yz");

                cameraRef.current?.position.set(300, 0, 0);
                cameraRef.current?.lookAt(tempPoint.x, 0, 0);
                return;
            }

            if (stage === "yz") {
                const finalPoint: [number, number, number] = [
                    tempPoint.x,
                    previewMesh.position.y,
                    previewMesh.position.z
                ];

                onPointComplete(finalPoint);
            }
        }
        console.log("register click");
        console.log
        window.addEventListener("click", onClick);
        return () => window.removeEventListener("click", onClick);
    }, [editorMode, stage]);

    // ========= 通常モードのカメラ ==========
    function resetCameraDefault() {
        cameraRef.current?.position.set(100, 100, 150);
        controls.target.set(0, 50, 0);
    }

    

    // ========= 点の同期 ==========
    useEffect(() => {
        if (!sceneRef.current) return;

        const meshes = meshesRef.current;

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
        if (lineRef.current) {
            scene.remove(lineRef.current);
            lineRef.current.geometry.dispose();
            lineRef.current = null;
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
        lineRef.current = line;
    }, [roboPoints]);

    return (
        <div
            ref={mountRef}
            id="three-canvas"
        />
    );
}