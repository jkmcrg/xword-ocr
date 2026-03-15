export function mapCharsToGrid(ocrResults, gridBounds, gridSize, imageWidth, imageHeight) {
  const grid = Array(gridSize).fill(null).map(() => 
    Array(gridSize).fill(null).map(() => ({ char: '', confidence: 0 }))
  );

  const cellW = gridBounds.width / gridSize;
  const cellH = gridBounds.height / gridSize;

  for (const result of ocrResults) {
    let x = result.x;
    let y = result.y;

    if (result.isNormalized) {
      x = result.x * imageWidth;
      y = result.y * imageHeight;
    }

    const col = Math.floor((x - gridBounds.x) / cellW);
    const row = Math.floor((y - gridBounds.y) / cellH);

    if (row >= 0 && row < gridSize && col >= 0 && col < gridSize) {
      const existing = grid[row][col];
      if (!existing.char || result.confidence > existing.confidence) {
        grid[row][col] = {
          char: result.char.toUpperCase(),
          confidence: result.confidence || 1
        };
      }
    }
  }

  return grid;
}

export function gridToArray(grid) {
  return grid.map(row => row.map(cell => cell.char || ''));
}

export function gridToFlatArray(grid, gridSize) {
  const result = [];
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      result.push({
        char: grid[row][col]?.char || '',
        isBlack: false,
        row,
        col,
        confidence: grid[row][col]?.confidence || 0
      });
    }
  }
  return result;
}

export function detectBlackCellsInGrid(canvas, gridBounds, gridSize) {
  const ctx = canvas.getContext('2d');
  const blackCells = new Set();
  
  const cellW = gridBounds.width / gridSize;
  const cellH = gridBounds.height / gridSize;
  const padding = Math.min(cellW, cellH) * 0.15;

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const x = gridBounds.x + col * cellW + padding;
      const y = gridBounds.y + row * cellH + padding;
      const w = cellW - padding * 2;
      const h = cellH - padding * 2;

      const imageData = ctx.getImageData(
        Math.floor(x), Math.floor(y), 
        Math.floor(w), Math.floor(h)
      );
      
      if (isCellBlack(imageData)) {
        blackCells.add(`${row},${col}`);
      }
    }
  }

  return blackCells;
}

function isCellBlack(imageData) {
  const data = imageData.data;
  let darkPixels = 0;
  const totalPixels = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
    if (gray < 50) {
      darkPixels++;
    }
  }

  return (darkPixels / totalPixels) > 0.7;
}

export function mergeGridWithBlackCells(grid, blackCells) {
  return grid.map((row, rowIdx) => 
    row.map((cell, colIdx) => ({
      ...cell,
      isBlack: blackCells.has(`${rowIdx},${colIdx}`)
    }))
  );
}
