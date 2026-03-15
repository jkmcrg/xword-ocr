import JSZip from 'jszip';

function base64ToBlob(base64, mimeType = 'image/png') {
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

export async function exportDataset(trainingStore) {
  const zip = new JSZip();
  
  const puzzles = await trainingStore.getAllPuzzles();
  
  if (puzzles.length === 0) {
    throw new Error('No training puzzles to export');
  }

  const imagesFolder = zip.folder('images');
  const annotationsFolder = zip.folder('annotations');

  let totalLetters = 0;
  const letterCounts = {};

  for (let i = 0; i < puzzles.length; i++) {
    const puzzle = puzzles[i];
    const paddedIndex = String(i + 1).padStart(6, '0');
    const baseName = `puzzle_${paddedIndex}`;

    if (puzzle.sourceImage) {
      const imageBlob = base64ToBlob(puzzle.sourceImage);
      imagesFolder.file(`${baseName}.png`, imageBlob);
    }

    const annotation = {
      gridSize: puzzle.gridSize,
      gridBounds: puzzle.gridBounds,
      labels: puzzle.labels,
      timestamp: puzzle.timestamp,
      ocrProvider: puzzle.ocrProvider
    };

    annotationsFolder.file(`${baseName}.json`, JSON.stringify(annotation, null, 2));

    if (puzzle.labels) {
      for (const row of puzzle.labels) {
        for (const cell of row) {
          if (cell && cell !== '') {
            totalLetters++;
            letterCounts[cell] = (letterCounts[cell] || 0) + 1;
          }
        }
      }
    }
  }

  const metadata = {
    totalPuzzles: puzzles.length,
    totalLetters,
    letterCounts,
    gridSizes: puzzles.reduce((acc, p) => {
      const size = p.gridSize || 15;
      acc[size] = (acc[size] || 0) + 1;
      return acc;
    }, {}),
    exportDate: new Date().toISOString(),
    format: {
      images: 'Full source images (PNG)',
      annotations: 'JSON with gridSize, gridBounds, labels (2D array)',
      labels: '2D array where empty string = black cell'
    }
  };
  
  zip.file('metadata.json', JSON.stringify(metadata, null, 2));

  zip.file('README.txt', `Crossword Training Dataset
========================

This dataset contains ${puzzles.length} crossword puzzle(s) with ${totalLetters} labeled characters.

Structure:
- images/puzzle_NNNNNN.png - Full source images of scanned crosswords
- annotations/puzzle_NNNNNN.json - Grid annotations with:
  - gridSize: 15 or 21
  - gridBounds: { x, y, width, height } - detected grid region in pixels
  - labels: 2D array of characters ('' = black cell)
  - timestamp: when the puzzle was processed
  - ocrProvider: which OCR service was used

Usage:
To extract individual cell images for training, use gridBounds to locate the grid,
divide by gridSize to get cell dimensions, and crop each cell from the source image.

Exported: ${new Date().toISOString()}
`);

  const blob = await zip.generateAsync({ type: 'blob' });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `crossword-training-data-${timestamp}.zip`;
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { filename, puzzleCount: puzzles.length, letterCount: totalLetters };
}
