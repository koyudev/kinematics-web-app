// App.tsx

import React, { useRef, useState } from 'react';

import { Sidebar } from './components/sidebar/sidebar';
import { Toolbar} from './components/toolbar/Toolbar';
import { Tabbar } from './components/tabbar/Tabbar';
import { ThreeCanvas } from './components/threecanvas/ThreeCanvas';
import { TaskList } from './components/taskview/TaskList';
import './app.css';

export type Point = [number, number, number];

export function App() {
    type Target = "robo" | "task" | null;
    // 書くタブの点データ
    const [roboPoints, setRoboPoints] = useState<[number, number, number][]>([]);
    const [taskPoints, setTaskPoints] = useState<[number, number, number][]>([]);

    // 編集モード
    const [editorMode, setEditorMode] = useState<boolean>(false);
    // 編集中の軸
    const [editingAxis, setEditingAxis] = useState<"x" | "y" | "z" | null>(null);

    // 編集中の値
    const [inputPoint, setInputPoint] = useState<Point>([0, 0, 0]);
    const [target, setTarget] = useState<Target>(null);

    // 編集開始
    const startEditing = (target: Target) => {
        setInputPoint([0, 0, 0]);
        setTarget(target);
        setEditorMode(true);
    };

    const confirmEditing = (p: Point) => {
        if (target === "robo") {
            setRoboPoints(prev => [...prev, p]);
        } else if (target === "task") {
            setTaskPoints(prev => [...prev, p]);
        }
        setTarget(null);
        setEditorMode(false);
    };

    const removePoint = (target: Target) => {
        if (target === "robo") {
            setRoboPoints(prev => prev.slice(0, -1));
        } else if (target === "task") {
            setTaskPoints(prev => prev.slice(0, -1));
        }
    };
    
    // 点を保存
    const handleConfirm = () => {
        if (target === "robo") {
            setRoboPoints(prev => [...prev, inputPoint]);
        } else if (target === "task") {
            setTaskPoints(prev => [...prev, inputPoint]);
        }
        setTarget(null);
        setEditorMode(false);
    };

    const handleCancel = () => {
        setEditorMode(false);
    };

    const handleAddPointFromCanvas = (p: [number, number, number]) => {
        setRoboPoints([...roboPoints, p]);
        setEditorMode(false);  // ← 確定したら編集終了
    };

    return (
        <div id="app-container">
            <div style={{ display: 'flex', flexDirection: 'column', width: '400px' }}>
                <Sidebar
                    roboPoints={roboPoints}
                    onAddPoint={() => startEditing("robo")}
                    onRemovePoint={() => removePoint("robo")}
                />

            </div>
            <div id="three-canvas-container">
                <ThreeCanvas
                    roboPoints={roboPoints} 
                    taskPoints={taskPoints}
                    editorMode={editorMode} 
                    onInputPointChange={setInputPoint}
                    onPointComplete={confirmEditing}
                />
                {editorMode && (
                    <Toolbar
                        point={inputPoint}
                        onFocusX={() => {setEditingAxis("x");}}
                        onFocusY={() => {setEditingAxis("y");}}
                        onFocusZ={() => {setEditingAxis("z");}}
                        onChange={setInputPoint}
                        onConfirm={handleConfirm}
                        onCancel={handleCancel}
                    />
                )}
            </div>

            <TaskList
                taskPoints={taskPoints}
                onAddPoint={() => startEditing("task")}
                onRemovePoint={() => removePoint("task")}
            />
        </div>
    );
}
