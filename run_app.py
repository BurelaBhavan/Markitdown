import sys
import os
import webbrowser
from pathlib import Path

# Fix Windows console UTF-8 output encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Add package paths
repo_root = Path(__file__).parent
pkg_src = repo_root / "packages" / "markitdown" / "src"
if pkg_src.exists() and str(pkg_src) not in sys.path:
    sys.path.insert(0, str(pkg_src))

import uvicorn

if __name__ == "__main__":
    port = 8000
    host = "127.0.0.1"
    url = f"http://{host}:{port}"
    print(f"\n=======================================================")
    print(f"[MarkItDown Web Application] Starting server...")
    print(f"URL: {url}")
    print(f"=======================================================\n")
    
    # Try opening browser after start
    try:
        webbrowser.open(url)
    except Exception:
        pass

    uvicorn.run("web_app.server:app", host=host, port=port, reload=True)
