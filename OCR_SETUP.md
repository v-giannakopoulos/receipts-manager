# OCR Feature Setup Guide

This guide explains how to set up and use the OCR (Optical Character Recognition) feature to automatically extract information from receipt images.

## 🎯 What Does OCR Do?

The OCR feature automatically reads text from receipt images and extracts:
- **Shop/Merchant name**
- **Purchase date**
- **Total amount**
- **Individual items** (names and prices)

You can then review and edit the extracted information before saving.

## 📦 Installation Options

You have two OCR engine choices:

### Option 1: EasyOCR (Recommended)

**Advantages:**
- More accurate text recognition
- Supports 80+ languages out of the box
- No additional system installations needed
- Works well with multilingual receipts (English, Dutch, Greek, etc.)

**Disadvantages:**
- Larger download (~500MB for models on first run)
- Slightly slower on first use

**Installation:**
```bash
pip install easyocr pillow numpy
```

### Option 2: Tesseract OCR

**Advantages:**
- Lightweight and fast
- Industry standard
- Lower memory usage

**Disadvantages:**
- Requires system installation
- May be less accurate on some receipts
- Needs language packs installed separately

**Installation:**

**macOS:**
```bash
brew install tesseract
pip install pytesseract pillow
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install tesseract-ocr
pip install pytesseract pillow
```

**Windows:**
1. Download installer from: https://github.com/UB-Mannheim/tesseract/wiki
2. Install Tesseract
3. Add to PATH or note installation directory
4. Install Python package:
```bash
pip install pytesseract pillow
```

### Installing Language Packs (Tesseract only)

For multilingual support with Tesseract:

**macOS:**
```bash
brew install tesseract-lang
```

**Ubuntu/Debian:**
```bash
# Dutch
sudo apt-get install tesseract-ocr-nld
# Greek
sudo apt-get install tesseract-ocr-ell
# German
sudo apt-get install tesseract-ocr-deu
```

## 🚀 Quick Start

### 1. Install Dependencies

**For EasyOCR (recommended):**
```bash
cd receipts-manager
pip install -r requirements.txt
```

**For Tesseract:**
```bash
# Install Tesseract system package first (see above)
pip install pytesseract pillow
```

### 2. Test OCR from Command Line

Test the OCR service with a receipt image:

```bash
# Using EasyOCR (default)
python ocr_service.py path/to/receipt.jpg

# Using Tesseract
python ocr_service.py path/to/receipt.jpg tesseract
```

Example output:
```
Processing receipt with easyocr...
------------------------------------------------------------

Shop: Albert Heijn B.V.
Date: 2024-Feb-15
Total: €45.67

Items found: 5
  - Melk Halfvol 1L: €1.29
  - Brood Volkoren: €2.15
  - Appels Elstar 1kg: €2.99
  - Koffie Filtermaling: €4.85
  - Kaas Jong Belegen: €3.49

------------------------------------------------------------
Raw extracted text:
Albert Heijn B.V.
Hoofdstraat 123
1234 AB Amsterdam
...
```

### 3. Configure for Your Languages

Edit the OCR service initialization in `app.py` or `ocr_service.py`:

```python
# For English and Dutch receipts
ocr_service = OCRService(engine="easyocr", languages=['en', 'nl'])

# For English, Dutch, and Greek receipts
ocr_service = OCRService(engine="easyocr", languages=['en', 'nl', 'el'])

# For Tesseract (uses system language packs)
ocr_service = OCRService(engine="tesseract", languages=['eng', 'nld', 'ell'])
```

## 🎨 Using OCR in the Web Interface

### Method 1: Drag and Drop
1. Open the Receipt Manager web interface
2. Drag a receipt image into the upload area
3. The OCR will automatically process the image
4. Review the extracted information
5. Edit any incorrect fields
6. Click "Save Receipt"

### Method 2: File Upload
1. Click the "Choose File" button
2. Select your receipt image
3. OCR processes automatically
4. Review and edit the extracted data
5. Save the receipt

## 📋 Supported Image Formats

- **JPEG/JPG** (.jpg, .jpeg)
- **PNG** (.png)
- **BMP** (.bmp)
- **TIFF** (.tiff, .tif)
- **WebP** (.webp)

## 💡 Tips for Best OCR Results

### Image Quality
- **Good lighting**: Take photos in well-lit areas
- **Straight angle**: Hold camera directly above receipt
- **In focus**: Ensure text is sharp and readable
- **Flat surface**: Lay receipt flat, avoid folds or wrinkles
- **High resolution**: Use at least 1200x1600 pixels
- **Avoid shadows**: Ensure even lighting across the receipt

### Receipt Condition
- **Clean receipts**: Work best (avoid stains or tears)
- **Printed receipts**: Better than handwritten notes
- **Dark text on light background**: Most reliable
- **Thermal receipts**: Scan before they fade

### Image Preprocessing (Optional)

For challenging receipts, you can improve OCR accuracy with preprocessing:

```python
import cv2
import numpy as np
from PIL import Image

def preprocess_receipt(image_path, output_path):
    """Enhance receipt image for better OCR."""
    # Read image
    img = cv2.imread(image_path)
    
    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Reduce noise
    denoised = cv2.fastNlMeansDenoising(gray)
    
    # Increase contrast
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    enhanced = clahe.apply(denoised)
    
    # Binarize (black and white)
    _, binary = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # Save processed image
    cv2.imwrite(output_path, binary)
    return output_path

# Use it
processed = preprocess_receipt('receipt.jpg', 'receipt_processed.jpg')
data = extract_receipt_data(processed)
```

## 🔧 Troubleshooting

### EasyOCR Issues

**"Module not found: easyocr"**
```bash
pip install easyocr
```

**"Downloading model files..." (first run)**
- This is normal on first use
- Models are cached for future use
- Requires ~500MB download
- Subsequent runs will be faster

**"CUDA not available" warning**
- This is normal if you don't have a GPU
- OCR will use CPU (still works fine, just slower)
- For GPU support: `pip install torch torchvision`

### Tesseract Issues

**"TesseractNotFoundError"**
- Tesseract is not installed or not in PATH
- Install using instructions above
- On Windows, you may need to set the path:
  ```python
  import pytesseract
  pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
  ```

**"Failed to load language"**
- Language pack not installed
- Install using instructions above for your OS

### Poor OCR Accuracy

**If extracted text is gibberish:**
1. Check image quality (see tips above)
2. Try the other OCR engine (EasyOCR vs Tesseract)
3. Ensure correct language codes are configured
4. Preprocess the image (see preprocessing section)

**If shop name is wrong:**
- OCR picks the first substantial text line
- Manually edit the field after extraction
- Shop name will be remembered for future receipts

**If date is wrong:**
- Multiple date formats are supported
- If OCR fails, it defaults to today's date
- Manually correct and save

**If items are missing:**
- OCR looks for price patterns (numbers with 2 decimals)
- Some receipts have unusual formatting
- Add items manually if needed

## 🌍 Language Support

### EasyOCR Language Codes

Common languages for European receipts:
- `'en'` - English
- `'nl'` - Dutch (Nederlands)
- `'el'` - Greek (Ελληνικά)
- `'de'` - German (Deutsch)
- `'fr'` - French (Français)
- `'it'` - Italian (Italiano)
- `'es'` - Spanish (Español)
- `'pt'` - Portuguese (Português)
- `'lv'` - Latvian (Latviešu)

Full list: https://www.jaided.ai/easyocr/

### Tesseract Language Codes

Use 3-letter ISO codes:
- `'eng'` - English
- `'nld'` - Dutch
- `'ell'` - Greek
- `'deu'` - German
- `'fra'` - French
- `'ita'` - Italian
- `'spa'` - Spanish
- `'por'` - Portuguese
- `'lav'` - Latvian

## 🔒 Privacy & Security

- **Local processing**: All OCR happens on your computer
- **No cloud**: Receipt images are never sent to external services
- **Your data**: Stays in your `_Receipts` folder
- **Open source**: You can inspect the code

## 📚 Advanced Usage

### Batch Processing

Process multiple receipts from command line:

```bash
#!/bin/bash
# Process all receipts in a folder

for img in receipts/*.jpg; do
    echo "Processing $img..."
    python ocr_service.py "$img" easyocr
    echo "---"
done
```

### Custom Parsing Rules

You can customize the parsing logic in `ocr_service.py`:

```python
def _extract_shop(self, text: str) -> str:
    """Customize shop extraction logic."""
    # Add your custom logic here
    # For example, prioritize certain stores:
    if 'albert heijn' in text.lower():
        return 'Albert Heijn'
    # ... rest of logic
```

### Integration with Other Tools

```python
# Use as a Python module
from ocr_service import extract_receipt_data

# Extract data
data = extract_receipt_data(
    'receipt.jpg', 
    engine='easyocr',
    languages=['en', 'nl', 'el']
)

# Use the data
print(f"Spent €{data['total_amount']} at {data['shop']}")
for item in data['items']:
    print(f"  - {item['name']}: €{item['price']}")
```

## 🆘 Getting Help

If you encounter issues:

1. Check this documentation
2. Test with the command-line tool first
3. Verify your image quality
4. Try the other OCR engine
5. Check the GitHub issues
6. Create a new issue with:
   - Your OS
   - OCR engine used
   - Example receipt image (remove personal info)
   - Error message

## 📝 Next Steps

Once OCR is working:
- The web interface will automatically use it
- Upload receipt images and watch them auto-populate
- Build a complete receipt database with minimal typing
- Export your data to Excel/CSV for expense reports

Enjoy automated receipt management! 🎉
