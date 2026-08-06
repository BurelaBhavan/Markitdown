FROM python:3.12-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Copy requirement files and package
COPY requirements.txt /app/requirements.txt
COPY packages /app/packages
COPY web_app /app/web_app
COPY run_app.py /app/run_app.py

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir -e /app/packages/markitdown

EXPOSE 8000

# Start web application server on $PORT or default 8000
CMD exec uvicorn web_app.server:app --host 0.0.0.0 --port ${PORT:-8000}
