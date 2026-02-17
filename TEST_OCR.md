# Testing the OCR Feature

This guide helps you test the OCR functionality before integrating it into your web application.

## Quick Test

### Step 1: Install Dependencies

```bash
# Install EasyOCR (recommended)
pip install easyocr pillow numpy

# OR install Tesseract
# macOS: brew install tesseract
# Ubuntu: sudo apt-get install tesseract-ocr
pip install pytesseract pillow
```

### Step 2: Test with a Receipt Image

**Using EasyOCR:**
```bash
python ocr_service.py path/to/receipt.jpg
```

**Using Tesseract:**
```bash
python ocr_service.py path/to/receipt.jpg tesseract
```

### Step 3: Verify Output

You should see output like:

```
Processing receipt with easyocr...
------------------------------------------------------------

Shop: Albert Heijn
Date: 2024-Feb-15
Total: €45.67

Items found: 5
  - Milk 1L: €1.29
  - Bread Whole Wheat: €2.15
  - Apples 1kg: €2.99
  - Coffee Ground: €4.85
  - Cheese Young: €3.49

------------------------------------------------------------
Raw extracted text:
Albert Heijn B.V.
Hoofdstraat 123
1234 AB Amsterdam

Date: 15-02-2024
Time: 14:23

Milk 1L                    1.29
Bread Whole Wheat          2.15
Apples 1kg                 2.99
Coffee Ground              4.85
Cheese Young               3.49

Subtotal:                 14.77
Tax:                       0.90
TOTAL:                    15.67

Thank you for shopping!
```

## Testing Different Receipt Types

### Dutch Supermarket Receipt

Typical format:
```
Albert Heijn / Jumbo / Dirk
Street Address
Postal Code + City

Date: DD-MM-YYYY
Time: HH:MM

Item Name                  Price
...

Totaal / Total: €XX.XX
```

### Restaurant Receipt

Typical format:
```
Restaurant Name
Address

Table: X
Date: DD/MM/YYYY

Item 1                     €XX.XX
Item 2                     €XX.XX

Subtotal:                 €XX.XX
BTW/VAT (21%):           €X.XX
Total:                    €XX.XX
```

### Gas Station Receipt

Typical format:
```
Shell / BP / Esso
Station Address

Date: DD-MM-YYYY
Time: HH:MM

Pump: X
Product: Euro 95
Liters: XX.XX L
Price/L: €X.XXX

Total: €XX.XX
```

## Test Cases

### Test Case 1: Perfect Receipt

**Input:** Clear, well-lit photo of printed receipt
**Expected:** 
- Shop name extracted correctly
- Date in YYYY-MMM-DD format
- Total amount as float
- 3-5 items with names and prices

### Test Case 2: Poor Quality

**Input:** Blurry or dark photo
**Expected:**
- Some fields may be "N/A" or incorrect
- Fewer items extracted
- Manual editing required

### Test Case 3: Faded Thermal Receipt

**Input:** Old thermal receipt with faded text
**Expected:**
- May fail to extract text
- Recommend scanning fresh receipts

### Test Case 4: Multilingual Receipt

**Input:** Receipt with mixed languages (e.g., Dutch + English)
**Expected:**
- Both languages recognized
- Shop name and items extracted
- Configure: `languages=['en', 'nl']`

### Test Case 5: Handwritten Receipt

**Input:** Handwritten receipt or notes
**Expected:**
- Lower accuracy
- Likely needs manual correction
- OCR works best with printed text

## Python API Testing

Create a test script `test_ocr.py`:

```python
#!/usr/bin/env python3
"""
Test OCR functionality
"""

import sys
from ocr_service import extract_receipt_data

def test_ocr(image_path, engine='easyocr'):
    """
    Test OCR on a receipt image.
    """
    print(f"\n{'='*60}")
    print(f"Testing OCR with {engine}")
    print(f"Image: {image_path}")
    print(f"{'='*60}\n")
    
    try:
        # Extract data
        data = extract_receipt_data(
            image_path,
            engine=engine,
            languages=['en', 'nl', 'el']  # English, Dutch, Greek
        )
        
        # Display results
        print("✅ OCR Successful!\n")
        
        print(f"Shop:          {data.get('shop', 'N/A')}")
        print(f"Date:          {data.get('purchase_date', 'N/A')}")
        
        if data.get('total_amount'):
            print(f"Total:         €{data['total_amount']:.2f}")
        else:
            print(f"Total:         N/A")
        
        print(f"\nItems found:   {len(data.get('items', []))}")
        for i, item in enumerate(data.get('items', [])[:5], 1):
            print(f"  {i}. {item['name']:<30} €{item['price']}")
        
        if len(data.get('items', [])) > 5:
            print(f"  ... and {len(data['items']) - 5} more items")
        
        print(f"\n{'-'*60}")
        print("Raw text (first 500 chars):")
        print(f"{'-'*60}")
        raw = data.get('raw_text', '')
        print(raw[:500])
        if len(raw) > 500:
            print("...\n[truncated]")
        
        print(f"\n{'='*60}")
        print("✅ Test PASSED")
        print(f"{'='*60}\n")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Test FAILED")
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_ocr.py <image_path> [engine]")
        print("  engine: easyocr (default) or tesseract")
        sys.exit(1)
    
    image = sys.argv[1]
    engine = sys.argv[2] if len(sys.argv) > 2 else "easyocr"
    
    success = test_ocr(image, engine)
    sys.exit(0 if success else 1)
```

Run the test:

```bash
python test_ocr.py receipt.jpg
```

## Automated Testing

Create a test suite for multiple receipts:

```bash
#!/bin/bash
# test_all_receipts.sh

echo "Testing OCR on all receipt images..."
echo "===================================="

pass=0
fail=0

for img in test_receipts/*.jpg test_receipts/*.png; do
    if [ -f "$img" ]; then
        echo "\nTesting: $img"
        if python ocr_service.py "$img" > /dev/null 2>&1; then
            echo "✅ PASS: $img"
            ((pass++))
        else
            echo "❌ FAIL: $img"
            ((fail++))
        fi
    fi
done

echo "\n===================================="
echo "Results: $pass passed, $fail failed"
echo "===================================="
```

Make executable and run:

```bash
chmod +x test_all_receipts.sh
./test_all_receipts.sh
```

## Benchmark Testing

Compare EasyOCR vs Tesseract:

```python
#!/usr/bin/env python3
import time
from ocr_service import extract_receipt_data

def benchmark(image_path):
    engines = ['easyocr', 'tesseract']
    
    print(f"\nBenchmarking: {image_path}")
    print("=" * 60)
    
    for engine in engines:
        try:
            start = time.time()
            data = extract_receipt_data(image_path, engine=engine)
            elapsed = time.time() - start
            
            print(f"\n{engine.upper()}:")
            print(f"  Time:  {elapsed:.2f}s")
            print(f"  Shop:  {data.get('shop', 'N/A')[:30]}")
            print(f"  Date:  {data.get('purchase_date', 'N/A')}")
            print(f"  Items: {len(data.get('items', []))}")
            
        except Exception as e:
            print(f"\n{engine.upper()}: FAILED - {e}")
    
    print("\n" + "=" * 60)

# Usage
benchmark('receipt.jpg')
```

## Integration Testing

Test the API endpoint (after integration):

```bash
# Start the server
python app.py &
SERVER_PID=$!

# Wait for server to start
sleep 2

# Test OCR status
curl http://127.0.0.1:5000/api/ocr/status

# Test OCR processing
curl -X POST \
  -F "file=@receipt.jpg" \
  http://127.0.0.1:5000/api/ocr/process

# Stop server
kill $SERVER_PID
```

## Common Issues & Solutions

### Issue: "Module not found: easyocr"

**Solution:**
```bash
pip install easyocr pillow numpy
```

### Issue: "TesseractNotFoundError"

**Solution:**
```bash
# macOS
brew install tesseract

# Ubuntu
sudo apt-get install tesseract-ocr
```

### Issue: Very slow first run (EasyOCR)

**Solution:** This is normal. EasyOCR downloads models (~500MB) on first run. Subsequent runs are much faster.

### Issue: Poor accuracy

**Solutions:**
1. Check image quality (lighting, focus, resolution)
2. Try preprocessing the image
3. Try the other OCR engine
4. Ensure correct language is configured

### Issue: Wrong shop name

**Solution:** OCR picks the first substantial text line. This is normal - just edit manually. The shop name will be saved for future use.

## Success Criteria

✅ OCR service installs without errors
✅ Can process receipt images
✅ Extracts shop name (may need manual correction)
✅ Extracts date (or defaults to today)
✅ Extracts total amount (if visible on receipt)
✅ Extracts 3+ items with prices
✅ Raw text is readable
✅ Processing completes in <10 seconds

## Next Steps

Once testing is successful:

1. ✅ OCR works from command line
2. 🔄 Follow **INTEGRATION_GUIDE.md** to add to web app
3. 🎉 Start using OCR in your receipt manager!

## Need Help?

If tests fail:

1. Check **OCR_SETUP.md** for detailed troubleshooting
2. Verify image quality
3. Try both OCR engines
4. Check error messages carefully
5. Create an issue on GitHub with:
   - Your OS
   - OCR engine
   - Error message
   - Example image (remove personal info)

---

**Happy testing! 🧪✨**
