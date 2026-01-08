// App.tsx

import React, { use, useRef, useState, useEffect } from 'react';

import { RoboView } from './components/roboview/RoboView';
import { Toolbar} from './components/toolbar/Toolbar';
import { ThreeCanvas } from './components/threecanvas/ThreeCanvas';
import { TaskList } from './components/taskview/TaskView';
import { Point } from './types/point';
import { Task } from './types/task';
import './app.css';

export function App() {
    type Target = "robo" | "task" | null;
    // 点データ
    const [robotJoints, setRobotJoints] = useState<Point[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);

    // 編集モード
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [target, setTarget] = useState<Target>(null);

    const [editingAxis, setEditingAxis] = useState<"x" | "y" | "z" | null>(null);

    const [inputPoint, setInputPoint] = useState<Point>([0, 0, 0]);
    const [selectedJointIndex, setSelectedJointIndex] = useState<number>(0);
    const inputPointRef = useRef<Point>(inputPoint);
    useEffect(() => {
        inputPointRef.current = inputPoint;
    }, [inputPoint]);
    
    // 編集開始
    const startEditing = (target: Target) => {
        setInputPoint([0, 0, 0]);
        setTarget(target);
        setIsEditing(true);
    };
    // 点を保存
    const confirmEditing = () => {
        const inputPoint = inputPointRef.current;
        if (target === "robo") {
            setRobotJoints(prev => [...prev, inputPoint]);
        } else if (target === "task") {
            const selectedIndex = selectedJointIndex !== null ? selectedJointIndex : (robotJoints.length - 1);
            setTasks(prev => [...prev, 
                {
                    jointIndex: selectedIndex,
                    targetPosition: inputPoint
                }
        ]);
        }
        setTarget(null);
        setIsEditing(false);
    };
    const cancelEditing = () => {
        setTarget(null);
        setIsEditing(false);
    };

    const removePoint = (target: Target) => {
        if (target === "robo") {
            setRobotJoints(prev => prev.slice(0, -1));
        } else if (target === "task") {
            setTasks(prev => prev.slice(0, -1));
        }
    };
    return (
        <div id="app-container">
            <RoboView
                roboPoints={robotJoints}
                onAddPoint={() => startEditing("robo")}
                onRemovePoint={() => removePoint("robo")}
            />
            <div id="three-canvas-container">
                <ThreeCanvas
                    roboPoints={robotJoints} 
                    tasks={tasks}
                    isEditing={isEditing} 
                    target={target}
                    inputPoint={inputPoint}
                    onInputPointChange={setInputPoint}
                    selectedJointIndex={selectedJointIndex}
                    setSelectedJointIndex={setSelectedJointIndex}
                    onInputPointConfirm={confirmEditing}
                />
                {isEditing && (
                    <Toolbar
                        point={inputPoint}
                        onFocusX={() => {setEditingAxis("x");}}
                        onFocusY={() => {setEditingAxis("y");}}
                        onFocusZ={() => {setEditingAxis("z");}}
                        onChange={setInputPoint}
                        onConfirm={confirmEditing}
                        onCancel={cancelEditing}
                    />
                )}
            </div>

            <TaskList
                taskPoints={tasks}
                onAddPoint={() => startEditing("task")}
                onRemovePoint={() => removePoint("task")}
            />
        </div>
    );
}
