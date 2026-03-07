"""
Docling PDF-to-Markdown conversion sidecar.

Accepts a file path (as visible inside the container via volume mounts) and
returns structured Markdown that preserves table structure.  Called by the
Next.js app's textExtractor.ts via HTTP; pdf-parse is used as fallback if
this service is unavailable.

Endpoints:
  POST /convert  { "file_path": "/nas/volume2/..." }
               → { "markdown": "...", "pages": N }
  GET  /health  → { "status": "ok" }
"""

import os
import logging
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# Keep our own logger at INFO; silence noisy third-party loggers
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
for noisy in [
    "docling", "docling_core", "huggingface_hub",
    "transformers", "PIL", "RapidOCR",
]:
    logging.getLogger(noisy).setLevel(logging.WARNING)

# Suppress HuggingFace symlink warning on Windows (caching still works, just non-optimal)
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")


def _make_converter():
    """Build a DocumentConverter configured for GPU (CUDA) with CPU fallback."""
    from docling.document_converter import DocumentConverter
    from docling.datamodel.base_models import InputFormat
    from docling.document_converter import PdfFormatOption
    from docling.datamodel.pipeline_options import PdfPipelineOptions, AcceleratorOptions, AcceleratorDevice
    import torch

    if torch.cuda.is_available():
        device = AcceleratorDevice.CUDA
        logger.info(f"GPU detected: {torch.cuda.get_device_name(0)} — using CUDA")
    else:
        device = AcceleratorDevice.CPU
        logger.info(f"Running on CPU (torch {torch.__version__} has no CUDA support for this Python version)")

    pipeline_options = PdfPipelineOptions()
    pipeline_options.accelerator_options = AcceleratorOptions(device=device)
    # Force full-page OCR so that PDFs whose text layer contains garbage
    # (e.g. French payslip software that stores widget role names like
    # "CadreCommentaire" instead of actual values in the accessibility layer)
    # are read visually rather than from the corrupt text layer.
    pipeline_options.do_ocr = True
    # Disable table structure reconstruction: payslip tables have heavily merged
    # cells that confuse the table parser, producing repeated-header noise.
    # With table parsing off, Docling outputs OCR text in natural reading order
    # (label → value → ...) which is far more useful for LLM consumption.
    pipeline_options.do_table_structure = False

    return DocumentConverter(
        format_options={
            InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options),
        }
    )

app = FastAPI(title="Docling Sidecar", version="1.0.0")


class ConvertRequest(BaseModel):
    file_path: str


class ConvertResponse(BaseModel):
    markdown: str
    pages: int


@app.on_event("startup")
async def startup():
    """Pre-warm Docling on startup: build converter (triggers model download/cache)
    so the first real request doesn't pay the model-loading cost."""
    try:
        _make_converter()
        logger.info("Docling loaded successfully")
    except Exception as e:
        logger.warning(f"Docling pre-warm failed: {e}")


@app.post("/convert", response_model=ConvertResponse)
async def convert_document(req: ConvertRequest):
    if not os.path.exists(req.file_path):
        raise HTTPException(status_code=404, detail=f"File not found: {req.file_path}")

    ext = os.path.splitext(req.file_path)[1].lower()
    if ext not in {".pdf", ".docx", ".pptx", ".xlsx", ".html", ".md", ".txt"}:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    try:
        converter = _make_converter()
        logger.info(f"Converting: {req.file_path}")
        result = converter.convert(req.file_path)
        markdown = result.document.export_to_markdown()

        # Count pages: Docling exposes pages on the document object
        try:
            pages = len(result.document.pages)
        except Exception:
            pages = markdown.count("\n---\n") + 1  # rough estimate from HR markers

        logger.info(f"Done: {req.file_path} → {pages} page(s), {len(markdown)} chars")
        return ConvertResponse(markdown=markdown, pages=max(pages, 1))

    except Exception as e:
        logger.error(f"Conversion failed for {req.file_path}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    return {"status": "ok"}
