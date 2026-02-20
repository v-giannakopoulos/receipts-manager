FROM python:3.11-slim

# Install system dependencies
# - poppler-utils: required for PDF to image conversion (pdf2image)
# - libgl1 + libglib2.0-0: required by EasyOCR / OpenCV
RUN apt-get update && apt-get install -y \
    poppler-utils \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first for layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY app.py ocr_service.py ./
COPY templates/ templates/
COPY static/ static/

# Create directory structure (volumes will be mounted over these at runtime)
RUN mkdir -p data/database data/backups storage/_Receipts/uploads

EXPOSE 5000

CMD ["python", "app.py"]
