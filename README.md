# NYT Crossword Paper Filler

> **Original Prompt:**
> I love doing the NYT crossword but I can't track my streak or times because I like to print them out rather than do them on the app or online. I would like a web extension that solves both of these problems:
> - It takes a picture of the completed puzzle, scans it with OCR, loads it into memory, and then inputs it into the online web interface for the puzzle
> - It takes an amount of time for it to wait to input the last character, or 0 to bypass

A Chrome extension that scans your completed paper crossword puzzles and automatically fills them into the NYT crossword web interface.

## Features

- **Image Capture**: Take a photo with your webcam or upload an image file
- **OCR Processing**: Uses Tesseract.js to recognize handwritten letters
- **Grid Detection**: Automatically detects the crossword grid structure
- **Review & Edit**: Correct any OCR errors before filling
- **Configurable Timing**: Set a delay before the last character for time tracking
- **Training Data**: Builds a personal handwriting dataset for future CNN training

## Installation

1. Clone or download this repository
2. (Optional) Add icon files to `assets/icons/` (icon16.png, icon48.png, icon128.png)
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" in the top right
5. Click "Load unpacked" and select the extension folder
6. The extension icon will appear in your toolbar

## Usage

1. Navigate to an NYT crossword puzzle at `nytimes.com/crosswords`
2. Click on the top-left cell of the puzzle grid
3. Click the extension icon to open the popup
4. Either:
   - Use the **Camera** tab to capture a photo of your completed paper puzzle
   - Use the **Upload** tab to upload a photo file
5. Click **Process Grid** to run OCR on the image
6. Review the detected letters and click any cell to correct errors
7. Set your desired delay time (in seconds) before the final character
8. Click **Fill Puzzle** to automatically type the letters

## Tips for Best OCR Results

- Write letters clearly in CAPS
- Ensure good lighting when taking photos
- Keep the crossword grid straight in the frame
- Use a pen with good contrast against the paper

## Training Data

The extension collects your confirmed cell images to build a personalized handwriting dataset:

- Images are stored locally in IndexedDB
- Only confirmed/corrected letters are saved (not raw OCR guesses)
- Click "Export Dataset" to download as a ZIP file
- Dataset format: 28x28 grayscale PNGs + labels.json

Use this dataset to train a CNN on EMNIST architecture for improved accuracy.

## Technical Details

- **Manifest V3** Chrome extension
- **Tesseract.js** for local OCR processing
- **Canvas API** for image preprocessing
- **IndexedDB** for training data storage
- **JSZip** for dataset export

## File Structure

```
nyt-xword-paper-filler/
├── manifest.json           # Extension manifest
├── popup/
│   ├── popup.html         # Extension popup UI
│   ├── popup.css          # Styles
│   └── popup.js           # Main popup logic
├── content/
│   └── content.js         # Page interaction script
├── background/
│   └── background.js      # Service worker
├── lib/
│   ├── image-processor.js # Grid detection & preprocessing
│   ├── ocr-worker.js      # Tesseract.js wrapper
│   ├── training-store.js  # IndexedDB storage
│   └── dataset-export.js  # ZIP export functionality
├── docs/
│   └── PLAN.md            # Architecture & implementation plan
└── assets/
    └── icons/             # Extension icons
```

## Limitations

- Handwriting recognition accuracy varies - the review step is important
- Grid detection assumes a standard crossword layout
- Works only with the web version at nytimes.com/crosswords
- NYT may update their web interface, requiring content script updates

## License

MIT
