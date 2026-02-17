#!/usr/bin/env python3
"""
Code Snippet: OCR Endpoint for app.py

This file shows the exact code to add to your existing app.py
to enable OCR functionality.

DO NOT run this file directly. Copy the relevant parts into your app.py.
"""

# ============================================================================
# STEP 1: Add these imports at the top of app.py (after existing imports)
# ============================================================================

import base64
from io import BytesIO

# Try to import OCR service
try:
    from ocr_service import extract_receipt_data
    OCR_AVAILABLE = True
    print("✅ OCR service available")
except ImportError as e:
    OCR_AVAILABLE = False
    print("⚠️  OCR not available. Install with: pip install easyocr")
    print(f"   Error: {e}")


# ============================================================================
# STEP 2: Add OCR configuration (after directory definitions)
# ============================================================================

# OCR Configuration
OCR_ENGINE = "easyocr"  # or "tesseract"
OCR_LANGUAGES = ['en', 'nl']  # English and Dutch for Netherlands receipts
# For multilingual: ['en', 'nl', 'el', 'lv'] (English, Dutch, Greek, Latvian)


# ============================================================================
# STEP 3: Add this method to the Handler class (in do_POST method)
# ============================================================================

def do_POST(self):
    """Handle POST requests."""
    parsed = urlparse(self.path)
    path = parsed.path

    # ========================================
    # NEW: OCR Processing Endpoint
    # ========================================
    if path == "/api/ocr/process":
        if not OCR_AVAILABLE:
            self._set_headers(500)
            self.wfile.write(json.dumps({
                "success": False,
                "error": "OCR not available. Install: pip install easyocr"
            }).encode('utf-8'))
            return
        
        try:
            # Get content length
            length = int(self.headers.get("Content-Length", "0") or "0")
            if length == 0:
                self._set_headers(400)
                self.wfile.write(json.dumps({
                    "success": False,
                    "error": "No image data received"
                }).encode('utf-8'))
                return
            
            # Read uploaded data
            content = self.rfile.read(length)
            
            # Parse multipart form data
            boundary = self.headers.get('Content-Type', '').split('boundary=')[-1].encode()
            
            if not boundary:
                self._set_headers(400)
                self.wfile.write(json.dumps({
                    "success": False,
                    "error": "Invalid Content-Type header"
                }).encode('utf-8'))
                return
            
            # Split by boundary
            parts = content.split(b'--' + boundary)
            
            image_data = None
            for part in parts:
                if b'Content-Type: image' in part:
                    # Extract image data after headers
                    header_end = part.find(b'\r\n\r\n')
                    if header_end != -1:
                        image_data = part[header_end + 4:]
                        # Remove trailing boundary markers
                        if image_data.endswith(b'\r\n'):
                            image_data = image_data[:-2]
                        break
            
            if not image_data:
                self._set_headers(400)
                self.wfile.write(json.dumps({
                    "success": False,
                    "error": "Could not extract image from upload"
                }).encode('utf-8'))
                return
            
            # Save to temporary file
            temp_path = RECEIPTS_DIR / "temp_ocr_image.jpg"
            try:
                with open(temp_path, 'wb') as f:
                    f.write(image_data)
                
                print(f"🔍 Processing receipt with OCR (engine: {OCR_ENGINE})...")
                
                # Process with OCR
                result = extract_receipt_data(
                    str(temp_path),
                    engine=OCR_ENGINE,
                    languages=OCR_LANGUAGES
                )
                
                print(f"✅ OCR completed. Shop: {result.get('shop', 'N/A')}, "
                      f"Date: {result.get('purchase_date', 'N/A')}")
                
                # Return successful result
                self._set_headers(200)
                self.wfile.write(json.dumps({
                    "success": True,
                    "data": result
                }).encode('utf-8'))
                
            finally:
                # Always clean up temp file
                temp_path.unlink(missing_ok=True)
            
            return
            
        except Exception as e:
            print(f"❌ OCR Error: {e}")
            import traceback
            traceback.print_exc()
            
            self._set_headers(500)
            self.wfile.write(json.dumps({
                "success": False,
                "error": f"OCR processing failed: {str(e)}"
            }).encode('utf-8'))
            return
    
    # ========================================
    # Continue with existing endpoints...
    # ========================================
    
    if path == "/api/integrity/check":
        # existing code...
        pass
    
    # ... rest of your existing do_POST code


# ============================================================================
# STEP 4: Add status endpoint (optional but recommended)
# ============================================================================

def do_GET(self):
    """Handle GET requests."""
    parsed = urlparse(self.path)
    path = parsed.path

    # NEW: OCR status endpoint
    if path == "/api/ocr/status":
        self._set_headers(200)
        self.wfile.write(json.dumps({
            "available": OCR_AVAILABLE,
            "engine": OCR_ENGINE if OCR_AVAILABLE else None,
            "languages": OCR_LANGUAGES if OCR_AVAILABLE else None
        }).encode('utf-8'))
        return
    
    # ... rest of your existing do_GET code


# ============================================================================
# Usage Instructions
# ============================================================================

"""
TO INTEGRATE INTO YOUR app.py:

1. Copy the imports (STEP 1) to the top of your app.py
2. Copy the configuration (STEP 2) after your directory definitions
3. Add the OCR endpoint code (STEP 3) to your do_POST method
4. Optionally add the status endpoint (STEP 4) to your do_GET method

5. Install dependencies:
   pip install easyocr pillow numpy
   
   OR for Tesseract:
   brew install tesseract  # macOS
   sudo apt-get install tesseract-ocr  # Ubuntu
   pip install pytesseract pillow

6. Test:
   python app.py
   
   # In another terminal:
   curl http://127.0.0.1:5000/api/ocr/status

7. Use in web interface:
   - Add file upload input to templates/index.html
   - Add JavaScript to call /api/ocr/process
   - See INTEGRATION_GUIDE.md for complete frontend code

For complete working example, see the main app.py after integration.
"""


if __name__ == "__main__":
    print("This is a code snippet file, not meant to be run directly.")
    print("Copy the relevant sections into your app.py")
    print("See INTEGRATION_GUIDE.md for detailed instructions.")
