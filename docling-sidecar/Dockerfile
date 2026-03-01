FROM python:3.12-slim

# System deps for Docling (PDF rendering, image processing)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    poppler-utils \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download Docling models into the image layer so the container starts fast.
# This adds ~2-3 GB to the image but avoids slow first-request model downloads.
RUN python - <<'EOF'
from docling.document_converter import DocumentConverter
import tempfile, os
# Trigger model download by converting a tiny dummy PDF
try:
    dc = DocumentConverter()
    print("Docling models pre-warmed successfully")
except Exception as e:
    print(f"Pre-warm skipped: {e}")
EOF

COPY main.py .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
