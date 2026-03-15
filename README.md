# Scan paper xwords into nytimes.com/crosswords

Chrome browser extension.

## Status: doesn't work

## Notes

2.5 put into it so far. Started w tesseract, went to a cloud provider for text detection. They are all not doing well from what I can see.

PaddleOCR looks like it works really well so far. We just need to clean up the data before we sent it through. Try the puzzle.png in this dir.
- [go to the eval page](https://huggingface.co/spaces/PaddlePaddle/PaddleOCR-VL_Online_Demo)
- Select 'Element-level Recognition' tab
- Click 'Table Recognition' button

It does pretty well. But the structure and lines do really throw it off.

## Largely AI coded

With Claude Opus 4.5

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

### Prerequisites
- Node.js (v18+)
- npm

### Build & Install

```bash
# Install dependencies
npm install

# Build the extension
npm run build
```

### Load in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select this project folder
4. The extension icon will appear in your toolbar

### Development Mode

```bash
# Watch for changes and rebuild automatically
npm run watch
```

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
├── package.json            # Node dependencies (for testing)
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
├── tests/
│   ├── setup.js           # Test setup and mocks
│   ├── unit/              # Unit tests
│   └── integration/       # Integration tests
├── docs/
│   └── PLAN.md            # Architecture & implementation plan
└── assets/
    └── icons/             # Extension icons
```

## Testing

This project uses Jest for testing, following the testing pyramid philosophy:

- **Unit tests** (`tests/unit/`) - Test individual functions and modules
- **Integration tests** (`tests/integration/`) - Test component interactions

### Running Tests

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Test Structure

```
tests/
├── setup.js                      # Test setup and mocks
├── unit/
│   ├── image-processor.test.js   # Image processing unit tests
│   ├── training-store.test.js    # IndexedDB storage tests
│   └── content-script.test.js    # Keyboard input tests
└── integration/
    ├── messaging.test.js         # Extension messaging tests
    └── dataset-export.test.js    # Export functionality tests
```

### What's Tested

- **Image Processor**: Clamping, smoothing, peak detection, cell extraction, black cell detection
- **Training Store**: Sample storage, retrieval, counting, label management
- **Content Script**: Keyboard event dispatch, fill sequencing, timing delays
- **Messaging**: Popup-to-content communication, progress updates, error handling
- **Export**: ZIP generation, label formatting, filename generation

## Limitations

- Handwriting recognition accuracy varies - the review step is important
- Grid detection assumes a standard crossword layout
- Works only with the web version at nytimes.com/crosswords
- NYT may update their web interface, requiring content script updates

## License

MIT
