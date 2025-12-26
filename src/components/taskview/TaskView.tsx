import './taskview.css';

type Props = {
    taskPoints: [number, number, number][];
    onAddPoint: () => void;
    onRemovePoint: () => void;
};

export function TaskList({ taskPoints, onAddPoint, onRemovePoint }: Props) {
    return (
        <div id="taskview">
            <h2>操作</h2>

            <ul className="list">
                {taskPoints.map((p, i) => (
                    <li key={i}>({p[0]}, {p[1]}, {p[2]})</li>
                ))}
            </ul>
            <div className="list-tools">
                <button onClick={onAddPoint}>＋ 追加</button>
                <button onClick={onRemovePoint}>－ 削除</button>
            </div>
        </div>
    );
}