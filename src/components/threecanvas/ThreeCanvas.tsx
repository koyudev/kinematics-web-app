import './threecanvas.css';
import React, { useImperativeHandle, forwardRef, useRef, useEffect, useState, use } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer';
import { Point } from '../../types/point';
import { Task } from '../../types/task';
import { initializeThreeScene, resizeThreeCanvas, cleanupThreeScene} from './utils/canvas';
import { Bounds, addAxesFrame } from './utils/chart'
import { initializeOrbitControls, registerControlsShortcuts } from './utils/controls';
import { startAnimationLoop } from './utils/animation';
import * as view from './utils/view';
import { getPointer, raycast, pickMesh } from './utils/raycast';

export interface ThreeCanvasProps {
    roboPoints: Point[];
    tasks: Task[];
    isEditing: boolean;
    target: "robo" | "task" | null;
    inputPoint: Point;
    selectedJointIndex?: number | null;
    onInputPointChange: (point: Point) => void;
    setSelectedJointIndex: (index: number) => void;
    onInputPointConfirm: () => void;
}

export function ThreeCanvas({ roboPoints, tasks: taskPoints, isEditing, target, inputPoint, onInputPointChange, setSelectedJointIndex, onInputPointConfirm }: ThreeCanvasProps) {
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

    const [step, setStep] = useState<"jointindex" | "xy" | "z" | null>(null);
    const xyPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0));
    const yzPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(1, 0, 0), 0))

    const raycaster = new THREE.Raycaster();
    const mouseCoords = new THREE.Vector2();

    function updateMeshScale() {
        const camera = cameraRef.current;
        if (!camera) return;

        const scale = 1 / camera.zoom;

        // robo points
        roboMeshesRef.current.forEach(mesh => {
            mesh.scale.setScalar(scale);
        });

        // task points
        taskMeshesRef.current.forEach(mesh => {
            mesh.scale.setScalar(scale);
        });

        // preview
        if (previewMeshRef.current) {
            previewMeshRef.current.scale.setScalar(scale);
        }
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
        controls.addEventListener('change', updateMeshScale);
        controlsRef.current = controls;

        const unregisterControlsShortcuts = registerControlsShortcuts(controls);

        // 座標枠生成
        addAxesFrame(scene, bounds, unit);

        // リサイズ対応
        const onResize = () => {
            resizeThreeCanvas(mount, camera, renderer, labelRenderer, orthoViewSize);
        }
        window.addEventListener('resize', onResize);
        
        // animation loop
        startAnimationLoop(scene, camera, renderer, labelRenderer, controls);

        // cleanup
        return () => {
            cleanupThreeScene(mount, renderer, labelRenderer);
            unregisterControlsShortcuts();
            window.removeEventListener('resize', onResize);
        };
    }, []);

    // ---- isEditing change ----
    useEffect(() => {
        const scene = sceneRef.current;
        if (!scene) return;

        // 編集終了
        if (!isEditing) {
            setStep(null);
            return;
        }

        // 編集開始
        if (target === "robo") {
            setStep("xy");
        } else {
            setStep("jointindex");
        }

    }, [isEditing]);

    // ---- step change ----
    useEffect(() => {
        const scene = sceneRef.current;
        const camera = cameraRef.current;
         const controls = controlsRef.current;
        if (!scene || !camera || !controls) return;
        
        if (step === null) {
            if (previewMeshRef.current) {
                scene.remove(previewMeshRef.current);
                previewMeshRef.current.geometry.dispose();
                previewMeshRef.current = null;
            }

            if (previewLineRef.current) {
                scene.remove(previewLineRef.current);
                previewLineRef.current.geometry.dispose();
                previewLineRef.current = null;
            }
            view.reset(bounds, camera, controls);
        } else if (step === "xy") {
            const previewMesh = new THREE.Mesh(
                new THREE.SphereGeometry(10, 16, 16),
                new THREE.MeshBasicMaterial({ color: 0x00ff00 })
            );
            scene.add(previewMesh);
            previewMeshRef.current = previewMesh;
            view.setFront(bounds, camera, controls);
        } else if (step === "z") {
            view.setRight(bounds, camera, controls);
        }
    }, [step]);

    // ---- mouse move ----
    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

        function onMouseMove(event: MouseEvent) {
            if (!isEditing) return;

            const mount = mountRef.current;
            const camera = cameraRef.current;
            if (!mount || !camera) return;

            const pointer = getPointer(event, mount);

            if (step === "xy") {
                const position = raycast(raycaster, camera, pointer, xyPlaneRef.current);
                onInputPointChange([
                    position.x, position.y, position.z
                ]);
            }
            if (step === "z") {
                const position = raycast(raycaster, camera, pointer, yzPlaneRef.current);
                onInputPointChange([
                    inputPoint[0], inputPoint[1], position.z
                ]);
            }
        }

        mount.addEventListener("mousemove", onMouseMove);
        return () => mount.removeEventListener("mousemove", onMouseMove);
    }, [isEditing, step]);

    // ---- click ----
    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

        function onClick(event: MouseEvent) {
            if (!isEditing) return;

            if (step === "jointindex") {
                const mount = mountRef.current;
                const camera = cameraRef.current;
                if (!mount || !camera) return;

                const pointer = getPointer(event, mount);

                const jointIndex = pickMesh(
                    raycaster,
                    camera,
                    pointer,
                    roboMeshesRef.current
                );

                if (jointIndex === null) return;

                setSelectedJointIndex(jointIndex);
                setStep("xy");
                return;
            }
            if (step === "xy") {
                yzPlaneRef.current.constant = -inputPoint[0];
                setStep("z");
                return;
            }
            if (step === "z") {
                onInputPointConfirm();
                return;
            }
        }

        mount.addEventListener("click", onClick);
        return () => mount.removeEventListener("click", onClick);
    }, [isEditing, step, inputPoint]);

    // ---- preview mesh/line update ----
    useEffect(() => {
        const previewMesh = previewMeshRef.current;
        if (!isEditing || !previewMesh) return;

        previewMesh.position.set(inputPoint[0], inputPoint[1], inputPoint[2]);

        if (target === "task") return;

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
    }, [inputPoint]);

    // ---- robo points update ----
    useEffect(() => {
        if (!sceneRef.current) return;

        const meshes = roboMeshesRef.current;

        // add points
        while (meshes.length < roboPoints.length) {
            const geometry = new THREE.SphereGeometry(1, 16, 8);
            const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            const mesh = new THREE.Mesh(geometry, material);
            sceneRef.current.add(mesh);
            meshes.push(mesh);
        }
        // remove points
        while (meshes.length > roboPoints.length) {
            const removed = meshes.pop();
            if (removed) sceneRef.current.remove(removed);
        }
        // update positions
        roboPoints.forEach((p, i) => {
            meshes[i].position.set(p[0], p[1], p[2]);
        });
        
    }, [roboPoints]);
    // ---- robo line update ----
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
        const material = new THREE.LineBasicMaterial({ color: 0x0000ff });

        const line = new THREE.Line(geometry, material);
        scene.add(line);
        roboLineRef.current = line;
    }, [roboPoints]);

    // ---- task points update ----
    useEffect(() => {
        if (!sceneRef.current) return;

        const meshes = taskMeshesRef.current;

        // 追加が必要な点
        while (meshes.length < taskPoints.length) {
            const geometry = new THREE.SphereGeometry(1, 16, 8);
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
        taskPoints.forEach(({jointIndex, targetPosition}, i) => {
            meshes[i].position.set(targetPosition[0], targetPosition[1], targetPosition[2]);
        });
        
    }, [taskPoints]);

    return (
        <div ref={mountRef} id="three-canvas"/>
    );
}