# 📸 OCR Feature for Receipt Manager

## What's New?

Your Receipt Manager now has **Optical Character Recognition (OCR)** capabilities! This means you can:

✅ **Upload receipt images** (photos, scans)
✅ **Automatically extract** text and data from receipts
✅ **Pre-fill form fields** with extracted information
✅ **Review and edit** before saving
✅ **Support multiple languages** (English, Dutch, Greek, Latvian, and more)

## 🚀 Quick Start

### 1. Install OCR Dependencies

**Option A: EasyOCR (Recommended)**
```bash
cd receipts-manager
pip install easyocr pillow numpy
```

**Option B: Tesseract OCR**
```bash
# macOS
brew install tesseract
pip install pytesseract pillow

# Ubuntu/Debian
sudo apt-get install tesseract-ocr
pip install pytesseract pillow

# Windows
# Download from: https://github.com/UB-Mannheim/tesseract/wiki
pip install pytesseract pillow
```

### 2. Test OCR

Test with a receipt image:

```bash
python ocr_service.py path/to/receipt.jpg
```

Expected output:
```
Processing receipt with easyocr...
------------------------------------------------------------

Shop: Albert Heijn
Date: 2024-Feb-15
Total: €45.67

Items found: 5
  - Milk 1L: €1.29
  - Bread: €2.15
  ...
```

### 3. Integrate with Web App

Follow the **[INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)** for step-by-step instructions.

## 📚 Documentation

| Document | Description |
|----------|-------------|
| **[OCR_SETUP.md](OCR_SETUP.md)** | Complete setup guide, troubleshooting, tips |
| **[INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)** | How to add OCR to your app.py |
| **[app_ocr_snippet.py](app_ocr_snippet.py)** | Exact code to copy into app.py |
| **[ocr_service.py](ocr_service.py)** | OCR service implementation |

## 🎯 Features

### Automatic Extraction

- **Shop name** - Merchant/store name
- **Purchase date** - Transaction date  
- **Total amount** - Receipt total
- **Individual items** - Item names and prices
- **Raw text** - Complete OCR text output

### Multi-Language Support

**Pre-configured for Netherlands:**
- 🇬🇧 English
- 🇳🇱 Dutch (Nederlands)

**Easy to add more:**
- 🇬🇷 Greek (Ελληνικά)
- 🇱🇻 Latvian (Latviešu)
- 🇩🇪 German (Deutsch)
- 🇫🇷 French (Français)
- And 70+ more languages!

### Smart Parsing

- **Date detection** - Handles multiple formats (DD/MM/YYYY, YYYY-MM-DD, etc.)
- **Currency recognition** - Finds amounts with €, $, or decimal patterns
- **Shop identification** - Detects merchant name from receipt header
- **Item extraction** - Identifies products with prices

## 🔄 Workflow

```
1. User uploads receipt image 📷
       ↓
2. OCR extracts text 🔍
       ↓
3. Parser identifies fields 🏷️
       ↓
4. Form pre-fills with data ✍️
       ↓
5. User reviews & edits 👀
       ↓
6. Receipt saved to database 💾
```

## 🛠️ Integration Steps

### Step 1: Add OCR Service

The `ocr_service.py` file is already in your repository. It provides:

```python
# Simple usage
from ocr_service import extract_receipt_data

data = extract_receipt_data(
    'receipt.jpg',
    engine='easyocr',
    languages=['en', 'nl']
)

print(data['shop'])          # "Albert Heijn"
print(data['purchase_date']) # "2024-Feb-15"
print(data['total_amount'])  # 45.67
```

### Step 2: Add API Endpoint

Add OCR endpoint to `app.py`:

```python
# At top of app.py
from ocr_service import extract_receipt_data

# In Handler.do_POST method
if path == "/api/ocr/process":
    # Process uploaded image
    result = extract_receipt_data(temp_image_path)
    return json.dumps({"success": True, "data": result})
```

See **[app_ocr_snippet.py](app_ocr_snippet.py)** for complete code.

### Step 3: Add Frontend

Add image upload to your form:

```html
<input type="file" id="receipt-image" accept="image/*">
```

Add JavaScript to process upload:

```javascript
const file = imageInput.files[0];
const formData = new FormData();
formData.append('image', file);

const response = await fetch('/api/ocr/process', {
    method: 'POST',
    body: formData
});

const result = await response.json();
// Populate form fields with result.data
```

Complete example in **[INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)**.

## 💡 Usage Tips

### For Best OCR Results

✅ **Good lighting** - Natural daylight or bright indoor lighting
✅ **Flat receipt** - Smooth out wrinkles and folds
✅ **Straight angle** - Camera directly above receipt
✅ **In focus** - Text should be sharp and clear
✅ **High resolution** - At least 1200x1600 pixels
✅ **Clean receipt** - No stains, tears, or excessive fading

### Supported Formats

- JPEG/JPG (.jpg, .jpeg)
- PNG (.png)
- BMP (.bmp)
- TIFF (.tiff, .tif)
- WebP (.webp)

### Common Receipt Types

✅ **Supermarket receipts** - Albert Heijn, Jumbo, etc.
✅ **Restaurant bills** - Printed receipts
✅ **Retail receipts** - Clothing, electronics, etc.
✅ **Gas station receipts**
✅ **Pharmacy receipts**

⚠️ **Handwritten receipts** - May have lower accuracy
⚠️ **Faded thermal receipts** - May be difficult to read

## 🔧 Configuration

### Choose OCR Engine

**In app.py or when calling the service:**

```python
# EasyOCR (Recommended)
OCR_ENGINE = "easyocr"
OCR_LANGUAGES = ['en', 'nl']

# Tesseract (Lightweight)
OCR_ENGINE = "tesseract"
OCR_LANGUAGES = ['eng', 'nld']  # 3-letter codes for Tesseract
```

### Add More Languages

```python
# English, Dutch, Greek, Latvian
OCR_LANGUAGES = ['en', 'nl', 'el', 'lv']

# All your family's languages
OCR_LANGUAGES = ['en', 'nl', 'el', 'lv']  # English, Dutch, Greek, Latvian
```

### Performance Tuning

**EasyOCR:**
- First run downloads models (~500MB)
- Subsequent runs are much faster
- GPU support: `pip install torch torchvision`

**Tesseract:**
- Faster than EasyOCR
- Lower memory usage
- Install language packs as needed

## 🐛 Troubleshooting

### Installation Issues

**"Module not found: easyocr"**
```bash
pip install easyocr pillow numpy
```

**"TesseractNotFoundError"**
```bash
# macOS
brew install tesseract

# Ubuntu
sudo apt-get install tesseract-ocr
```

### OCR Accuracy Issues

**Poor text extraction:**
1. Check image quality (lighting, focus, resolution)
2. Try the other OCR engine
3. Ensure correct languages configured
4. See **[OCR_SETUP.md](OCR_SETUP.md)** for image preprocessing

**Wrong shop name:**
- OCR picks first substantial text
- Manually edit after extraction
- System learns from your corrections

**Missing or wrong dates:**
- Multiple date formats supported
- Defaults to today if not found
- Edit manually if incorrect

### Integration Issues

**OCR endpoint returns 500:**
```bash
# Check if OCR is available
python -c "import easyocr; print('OK')"

# Test directly
python ocr_service.py test.jpg
```

**Form doesn't populate:**
- Open browser console (F12)
- Check for JavaScript errors
- Verify field IDs match
- Check Network tab for API response

## 📊 Comparison: EasyOCR vs Tesseract

| Feature | EasyOCR | Tesseract |
|---------|---------|----------|
| **Accuracy** | ⭐⭐⭐⭐⭐ Higher | ⭐⭐⭐⭐ Good |
| **Speed** | ⭐⭐⭐ Moderate | ⭐⭐⭐⭐ Fast |
| **Setup** | ⭐⭐⭐⭐⭐ Easy | ⭐⭐⭐ Requires system install |
| **Languages** | 80+ built-in | Install per language |
| **Memory** | ~500MB | ~50MB |
| **GPU Support** | ✅ Yes | ❌ No |
| **Multi-lingual** | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐⭐ Good |
| **Maintenance** | pip install | System updates |

**Recommendation:** 
- **Start with EasyOCR** for best results
- **Switch to Tesseract** if you need lower memory usage

## 🔒 Privacy & Security

- ✅ **All processing is local** - No cloud services
- ✅ **No data transmission** - Images stay on your computer
- ✅ **Open source** - Inspect the code yourself
- ✅ **Your data, your control** - Stored in your `_Receipts` folder

## 🎓 Examples

### Command Line Usage

```bash
# Process a receipt
python ocr_service.py receipt.jpg

# Use Tesseract instead
python ocr_service.py receipt.jpg tesseract

# Batch process
for img in receipts/*.jpg; do
    python ocr_service.py "$img"
done
```

### Python API Usage

```python
from ocr_service import extract_receipt_data

# Basic usage
data = extract_receipt_data('receipt.jpg')
print(f"Spent €{data['total_amount']} at {data['shop']}")

# With custom configuration
data = extract_receipt_data(
    'receipt.jpg',
    engine='easyocr',
    languages=['en', 'nl', 'el']
)

# Access all extracted data
print(f"Shop: {data['shop']}")
print(f"Date: {data['purchase_date']}")
print(f"Total: €{data['total_amount']}")
for item in data['items']:
    print(f"  - {item['name']}: €{item['price']}")
print(f"\nRaw text:\n{data['raw_text']}")
```

## 🚀 Next Steps

1. **Install dependencies** - Choose EasyOCR or Tesseract
2. **Test OCR** - `python ocr_service.py receipt.jpg`
3. **Integrate** - Follow INTEGRATION_GUIDE.md
4. **Configure languages** - Set your language preferences
5. **Start scanning** - Upload receipt images!

## 📖 Further Reading

- **[OCR_SETUP.md](OCR_SETUP.md)** - Complete setup and configuration
- **[INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)** - Web integration walkthrough
- **[app_ocr_snippet.py](app_ocr_snippet.py)** - Ready-to-use code

## 🤝 Contributing

Found a bug? Have an improvement? 

1. Test your changes
2. Update documentation
3. Submit a pull request

## 📝 License

Same as the main Receipt Manager project.

---

**Happy receipt scanning! 📸✨**

Got questions? Check the documentation or create an issue on GitHub.
