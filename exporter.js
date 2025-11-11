// exporter.js

import * as THREE from 'three';

export async function setupLineLoader(scene) {
  const lineButton = document.createElement('button');
  lineButton.innerText = '線を表示';

  lineButton.style.top = '20px';
  lineButton.style.right = '20px';
  lineButton.style.zIndex = '10';
  document.getElementById('ui-panel-bottom').appendChild(lineButton);

  lineButton.addEventListener('click', async () => {
    try {
      const response = await fetch('/Temp/points.txt');
      const text = await response.text();
      const lines = text.trim().split('\n').filter(line => line.length > 0);

      for (let i = 0; i < lines.length - 1; i += 2) {
        const start = lines[i].split(/\s+/).map(Number);
        const end = lines[i + 1].split(/\s+/).map(Number);
        const points = [
          new THREE.Vector3(start[0], start[1], start[2]),
          new THREE.Vector3(end[0], end[1], end[2])
        ];

        const material = new THREE.LineBasicMaterial({ color: 0x0000ff });
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        scene.add(line);
      }
    } catch (err) {
      console.error('線データの取得に失敗しました:', err);
    }
  });
}

export function setupExportButton(scene, points) {
  const exportButton = document.createElement('button');
  exportButton.innerText = 'ジョイントデータを保存';
  exportButton.style.top = '60px';
  exportButton.style.right = '20px';
  exportButton.style.zIndex = '10';
  document.getElementById('ui-panel-top').appendChild(exportButton);

  exportButton.addEventListener('click', () => {
    exportJointData(scene, points);
  });
}

// pointsはinteractions.jsで管理しているため、
// ここではscene引数のみ受けている想定。必要に応じて引数でpointsを渡すなどに変更してください。
export function exportJointData(scene, points) {
  if (!points || points.length === 0) {
    alert('保存する点がありません');
    return;
  }

  const lines = [];
  lines.push(points.length.toString());

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    lines.push(`#${i}`);
    lines.push(`${p.x.toFixed(6)}\t${p.y.toFixed(6)}\t${p.z.toFixed(6)}`);
    lines.push(`0.0\t0.0\t1.0`);
    lines.push(`-1.570796327\t1.570796327`);
    const upper = i > 0 ? i - 1 : -1;
    const lower = i < points.length - 1 ? i + 1 : -1;
    lines.push(`${upper}\t-1`);
    lines.push(`${lower}\t-1`);
    lines.push(`0.01\t0.01`);
    lines.push(`0x00`);
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'joint_data.txt';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}