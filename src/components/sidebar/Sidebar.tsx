import './sidebar.css';

type Props = {
    roboPoints: [number, number, number][];
    onAddPoint: () => void;
    onRemovePoint: () => void;
};

export function Sidebar({ roboPoints, onAddPoint, onRemovePoint }: Props) {
    return (
        <div id="sidebar">
            <h2>ロボット構造</h2>

            <ul className="list">
                {roboPoints.map((p, i) => (
                    <li key={i}>({p[0].toFixed(2)}, {p[1].toFixed(2)}, {p[2].toFixed(2)})</li>
                ))}
            </ul>
            <div className="list-tools">
                <button onClick={onAddPoint}>＋ 追加</button>
                <button onClick={onRemovePoint}>－ 削除</button>
            </div>
        </div>
    );
}