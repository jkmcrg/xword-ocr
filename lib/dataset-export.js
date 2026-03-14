async function loadJSZip() {
  if (typeof JSZip !== 'undefined') {
    return JSZip;
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jszip@3/dist/jszip.min.js';
    script.onload = () => resolve(JSZip);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function imageDataToPNG(imageData) {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width || 28;
  canvas.height = imageData.height || 28;
  
  const ctx = canvas.getContext('2d');
  
  const imgData = ctx.createImageData(canvas.width, canvas.height);
  
  if (Array.isArray(imageData.imageData || imageData)) {
    const data = imageData.imageData || imageData;
    for (let i = 0; i < data.length; i++) {
      imgData.data[i] = data[i];
    }
  } else {
    imgData.data.set(imageData.data);
  }
  
  ctx.putImageData(imgData, 0, 0);
  
  return new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/png');
  });
}

export async function exportDataset(trainingStore) {
  const JSZipLib = await loadJSZip();
  const zip = new JSZipLib();
  
  const samples = await trainingStore.getAllSamples();
  
  if (samples.length === 0) {
    throw new Error('No training samples to export');
  }

  const imagesFolder = zip.folder('images');
  const labels = [];

  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];
    const filename = `sample_${String(i).padStart(6, '0')}.png`;
    
    const sampleData = {
      imageData: sample.imageData,
      width: sample.width,
      height: sample.height
    };
    
    const pngBlob = await imageDataToPNG(sampleData);
    imagesFolder.file(filename, pngBlob);
    
    labels.push({
      filename,
      label: sample.label,
      timestamp: sample.timestamp
    });
  }

  zip.file('labels.json', JSON.stringify(labels, null, 2));

  const labelCounts = {};
  for (const sample of samples) {
    labelCounts[sample.label] = (labelCounts[sample.label] || 0) + 1;
  }
  
  const metadata = {
    totalSamples: samples.length,
    labelCounts,
    imageSize: { width: 28, height: 28 },
    format: 'grayscale',
    exportDate: new Date().toISOString()
  };
  
  zip.file('metadata.json', JSON.stringify(metadata, null, 2));

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

  return { filename, sampleCount: samples.length };
}
