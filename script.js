const photoInput = document.getElementById('photoInput');
const gridWidth = document.getElementById('gridWidth');
const contrast = document.getElementById('contrast');
const brightness = document.getElementById('brightness');
const cropMode = document.getElementById('cropMode');
const detailMode = document.getElementById('detailMode');

const gridWidthValue = document.getElementById('gridWidthValue');
const contrastValue = document.getElementById('contrastValue');
const brightnessValue = document.getElementById('brightnessValue');

const generateBtn = document.getElementById('generateBtn');
const printBtn = document.getElementById('printBtn');
const downloadBtn = document.getElementById('downloadBtn');
const downloadSolutionBtn = document.getElementById('downloadSolutionBtn');

const sourceCanvas = document.getElementById('sourceCanvas');
const puzzleCanvas = document.getElementById('puzzleCanvas');
const solutionCanvas = document.getElementById('solutionCanvas');
const legend = document.getElementById('legend');

let loadedImage = null;
let lastGrid = null;

const patterns8 = [
  { id: 1, name: 'blanc', fill: 0, draw: drawEmpty },
  { id: 2, name: 'coin bas gauche', fill: 0.15, draw: drawTriangleBL },
  { id: 3, name: 'moitié gauche', fill: 0.30, draw: drawLeftHalf },
  { id: 4, name: 'diagonale bas', fill: 0.43, draw: drawDiagonalBottom },
  { id: 5, name: 'moitié basse', fill: 0.56, draw: drawBottomHalf },
  { id: 6, name: 'diagonale haut', fill: 0.70, draw: drawDiagonalTop },
  { id: 7, name: 'trois quarts', fill: 0.85, draw: drawThreeQuarter },
  { id: 8, name: 'noir', fill: 1, draw: drawFull }
];

const patterns12 = [
  { id: 1, name: 'blanc', fill: 0, draw: drawEmpty },
  { id: 2, name: 'petit coin', fill: 0.09, draw: drawSmallTriangle },
  { id: 3, name: 'coin bas gauche', fill: 0.18, draw: drawTriangleBL },
  { id: 4, name: 'quart gauche', fill: 0.27, draw: drawLeftQuarter },
  { id: 5, name: 'moitié gauche', fill: 0.36, draw: drawLeftHalf },
  { id: 6, name: 'diagonale bas', fill: 0.45, draw: drawDiagonalBottom },
  { id: 7, name: 'moitié basse', fill: 0.55, draw: drawBottomHalf },
  { id: 8, name: 'diagonale haut', fill: 0.64, draw: drawDiagonalTop },
  { id: 9, name: 'deux tiers', fill: 0.73, draw: drawTwoThirds },
  { id: 10, name: 'trois quarts', fill: 0.82, draw: drawThreeQuarter },
  { id: 11, name: 'presque noir', fill: 0.91, draw: drawAlmostFull },
  { id: 12, name: 'noir', fill: 1, draw: drawFull }
];

function activePatterns() {
  return detailMode.value === '12' ? patterns12 : patterns8;
}

function updateLabels() {
  gridWidthValue.textContent = `${gridWidth.value} cases`;
  contrastValue.textContent = contrast.value;
  brightnessValue.textContent = brightness.value;
}

[gridWidth, contrast, brightness, cropMode, detailMode].forEach(input => {
  input.addEventListener('input', () => {
    updateLabels();
    if (loadedImage) generatePortrait();
  });
});

photoInput.addEventListener('change', event => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      loadedImage = img;
      generateBtn.disabled = false;
      generatePortrait();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

generateBtn.addEventListener('click', generatePortrait);
printBtn.addEventListener('click', () => window.print());
downloadBtn.addEventListener('click', () => downloadCanvas(puzzleCanvas, 'portrait-code-grille.png'));
downloadSolutionBtn.addEventListener('click', () => downloadCanvas(solutionCanvas, 'portrait-code-solution.png'));

function generatePortrait() {
  if (!loadedImage) return;

  const cols = Number(gridWidth.value);
  const targetRatio = Math.SQRT2; // A4 portrait : hauteur / largeur
  const rows = Math.round(cols * targetRatio);
  const cell = Math.max(8, Math.floor(900 / cols));
  const width = cols * cell;
  const height = rows * cell;

  drawPreparedSource(cols, rows);
  const grid = sampleGrid(cols, rows);
  lastGrid = { grid, cols, rows, cell };

  drawPuzzle(grid, cols, rows, cell);
  drawSolution(grid, cols, rows, cell);
  drawLegend();

  printBtn.disabled = false;
  downloadBtn.disabled = false;
  downloadSolutionBtn.disabled = false;
}

function drawPreparedSource(cols, rows) {
  const maxW = 900;
  const cell = Math.max(8, Math.floor(maxW / cols));
  sourceCanvas.width = cols * cell;
  sourceCanvas.height = rows * cell;
  const ctx = sourceCanvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, sourceCanvas.width, sourceCanvas.height);
  drawImageFitted(ctx, loadedImage, 0, 0, sourceCanvas.width, sourceCanvas.height, cropMode.value);

  const imgData = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
  applyImageAdjustments(imgData.data);
  ctx.putImageData(imgData, 0, 0);
}

function sampleGrid(cols, rows) {
  const off = document.createElement('canvas');
  off.width = cols;
  off.height = rows;
  const ctx = off.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, cols, rows);
  drawImageFitted(ctx, loadedImage, 0, 0, cols, rows, cropMode.value);

  const imgData = ctx.getImageData(0, 0, cols, rows);
  applyImageAdjustments(imgData.data);
  const data = imgData.data;
  const patterns = activePatterns();
  const grid = [];

  for (let y = 0; y < rows; y++) {
    const row = [];
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      const darkness = 1 - gray / 255;
      row.push(closestPattern(darkness, patterns));
    }
    grid.push(row);
  }
  return grid;
}

function closestPattern(darkness, patterns) {
  let best = patterns[0];
  let bestDistance = Infinity;
  for (const pattern of patterns) {
    const distance = Math.abs(pattern.fill - darkness);
    if (distance < bestDistance) {
      best = pattern;
      bestDistance = distance;
    }
  }
  return best;
}

function applyImageAdjustments(data) {
  const c = Number(contrast.value);
  const b = Number(brightness.value);
  const factor = (259 * (c + 255)) / (255 * (259 - c));

  for (let i = 0; i < data.length; i += 4) {
    let r = factor * (data[i] - 128) + 128 + b;
    let g = factor * (data[i + 1] - 128) + 128 + b;
    let bl = factor * (data[i + 2] - 128) + 128 + b;
    const gray = clamp(0.299 * r + 0.587 * g + 0.114 * bl, 0, 255);
    data[i] = data[i + 1] = data[i + 2] = gray;
  }
}

function drawImageFitted(ctx, img, x, y, w, h, mode) {
  const imageRatio = img.width / img.height;
  const boxRatio = w / h;
  let drawW, drawH, drawX, drawY;

  if ((mode === 'cover' && imageRatio > boxRatio) || (mode === 'contain' && imageRatio < boxRatio)) {
    drawH = h;
    drawW = h * imageRatio;
    drawX = x + (w - drawW) / 2;
    drawY = y;
  } else {
    drawW = w;
    drawH = w / imageRatio;
    drawX = x;
    drawY = y + (h - drawH) / 2;
  }
  ctx.drawImage(img, drawX, drawY, drawW, drawH);
}

function drawPuzzle(grid, cols, rows, cell) {
  puzzleCanvas.width = cols * cell;
  puzzleCanvas.height = rows * cell;
  const ctx = puzzleCanvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, puzzleCanvas.width, puzzleCanvas.height);
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 1;
  ctx.font = `${Math.max(6, cell * 0.42)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#111';

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      ctx.strokeRect(x * cell, y * cell, cell, cell);
      ctx.fillText(grid[y][x].id, x * cell + cell / 2, y * cell + cell / 2);
    }
  }
}

function drawSolution(grid, cols, rows, cell) {
  solutionCanvas.width = cols * cell;
  solutionCanvas.height = rows * cell;
  const ctx = solutionCanvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, solutionCanvas.width, solutionCanvas.height);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      drawCellPattern(ctx, grid[y][x], x * cell, y * cell, cell, false);
    }
  }

  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= cols; x++) {
    ctx.beginPath();
    ctx.moveTo(x * cell, 0);
    ctx.lineTo(x * cell, rows * cell);
    ctx.stroke();
  }
  for (let y = 0; y <= rows; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * cell);
    ctx.lineTo(cols * cell, y * cell);
    ctx.stroke();
  }
}

function drawLegend() {
  legend.innerHTML = '';
  for (const pattern of activePatterns()) {
    const item = document.createElement('div');
    item.className = 'legend-item';

    const swatch = document.createElement('canvas');
    swatch.className = 'swatch';
    swatch.width = 64;
    swatch.height = 64;
    const ctx = swatch.getContext('2d');
    drawCellPattern(ctx, pattern, 0, 0, 64, true);

    const text = document.createElement('div');
    text.innerHTML = `<strong>${pattern.id}</strong><br><span>${pattern.name}</span>`;

    item.appendChild(swatch);
    item.appendChild(text);
    legend.appendChild(item);
  }
}

function drawCellPattern(ctx, pattern, x, y, size, border = true) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, size, size);
  ctx.clip();
  ctx.fillStyle = '#fff';
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = '#111';
  pattern.draw(ctx, x, y, size);
  ctx.restore();

  if (border) {
    ctx.strokeStyle = '#111';
    ctx.lineWidth = Math.max(1, size * 0.025);
    ctx.strokeRect(x, y, size, size);
  }
}

function drawEmpty() {}

function drawFull(ctx, x, y, s) {
  ctx.fillRect(x, y, s, s);
}

function drawLeftHalf(ctx, x, y, s) {
  ctx.fillRect(x, y, s / 2, s);
}

function drawBottomHalf(ctx, x, y, s) {
  ctx.fillRect(x, y + s / 2, s, s / 2);
}

function drawLeftQuarter(ctx, x, y, s) {
  ctx.fillRect(x, y, s * 0.28, s);
}

function drawTwoThirds(ctx, x, y, s) {
  ctx.fillRect(x, y, s * 0.66, s);
}

function drawThreeQuarter(ctx, x, y, s) {
  ctx.fillRect(x, y, s * 0.75, s);
}

function drawAlmostFull(ctx, x, y, s) {
  ctx.fillRect(x, y, s, s);
  ctx.clearRect(x + s * 0.72, y, s * 0.28, s * 0.28);
}

function drawTriangleBL(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s);
  ctx.lineTo(x, y);
  ctx.lineTo(x + s, y + s);
  ctx.closePath();
  ctx.fill();
}

function drawSmallTriangle(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s);
  ctx.lineTo(x, y + s * 0.45);
  ctx.lineTo(x + s * 0.55, y + s);
  ctx.closePath();
  ctx.fill();
}

function drawDiagonalBottom(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s);
  ctx.lineTo(x + s, y + s);
  ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();
}

function drawDiagonalTop(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + s, y);
  ctx.lineTo(x + s, y + s);
  ctx.closePath();
  ctx.fill();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function downloadCanvas(canvas, filename) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

updateLabels();
drawLegend();