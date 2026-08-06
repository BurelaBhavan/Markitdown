import os
import sys
import time
import tempfile
import math
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

# Ensure markitdown package is importable
repo_root = Path(__file__).parent.parent
pkg_src = repo_root / "packages" / "markitdown" / "src"
if pkg_src.exists() and str(pkg_src) not in sys.path:
    sys.path.insert(0, str(pkg_src))

from markitdown import MarkItDown
from markitdown._exceptions import FileConversionException, UnsupportedFormatException

app = FastAPI(
    title="MarkItDown Web API",
    description="Convert PDFs, Office documents, and media into clean Markdown for AI token optimization.",
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize MarkItDown converter instance
converter = MarkItDown()

STATIC_DIR = Path(__file__).parent / "static"
STATIC_DIR.mkdir(parents=True, exist_ok=True)


def estimate_tokens(text: str) -> int:
    """Rough estimation of token count (~4 characters per token for English/Markdown)."""
    if not text:
        return 0
    words = len(text.split())
    chars = len(text)
    # Average between word-based and character-based heuristics
    return math.ceil(max(words * 1.3, chars / 4.0))


@app.post("/api/convert")
async def convert_file(
    file: UploadFile = File(...)
):
    """
    Accepts an uploaded file (PDF, DOCX, PPTX, XLSX, HTML, TXT, CSV, Images),
    converts it to Markdown using MarkItDown, and returns the Markdown output
    along with file metadata and token savings statistics.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Uploaded file has no filename.")

    filename = file.filename
    ext = Path(filename).suffix.lower()

    # Save uploaded file to a temporary file
    temp_dir = tempfile.mkdtemp()
    temp_path = Path(temp_dir) / filename

    start_time = time.time()
    try:
        content = await file.read()
        file_size_bytes = len(content)

        with open(temp_path, "wb") as f:
            f.write(content)

        # Execute MarkItDown conversion
        result = converter.convert(str(temp_path))
        markdown_text = result.text_content or ""
        elapsed_seconds = round(time.time() - start_time, 3)

        # Estimate tokens and savings
        md_tokens = estimate_tokens(markdown_text)
        
        raw_tokens_est = max(int(md_tokens * 1.8), int(file_size_bytes / 3.5))

        token_savings_pct = 0
        if raw_tokens_est > md_tokens and raw_tokens_est > 0:
            token_savings_pct = round(((raw_tokens_est - md_tokens) / raw_tokens_est) * 100, 1)

        lines_count = len(markdown_text.splitlines())
        chars_count = len(markdown_text)
        words_count = len(markdown_text.split())

        return JSONResponse(content={
            "success": True,
            "filename": filename,
            "file_size_bytes": file_size_bytes,
            "file_extension": ext,
            "markdown": markdown_text,
            "execution_time_seconds": elapsed_seconds,
            "stats": {
                "markdown_tokens": md_tokens,
                "raw_estimated_tokens": raw_tokens_est,
                "token_savings_percent": token_savings_pct,
                "character_count": chars_count,
                "word_count": words_count,
                "line_count": lines_count
            }
        })

    except UnsupportedFormatException as ufe:
        raise HTTPException(status_code=400, detail=f"Unsupported format '{ext}': {str(ufe)}")
    except FileConversionException as fce:
        raise HTTPException(status_code=422, detail=f"Failed to convert file '{filename}': {str(fce)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file '{filename}': {str(e)}")
    finally:
        # Cleanup temporary file
        if temp_path.exists():
            try:
                os.remove(temp_path)
                os.rmdir(temp_dir)
            except Exception:
                pass


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "MarkItDown Web API"}


# Serve static files for frontend UI
app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")
