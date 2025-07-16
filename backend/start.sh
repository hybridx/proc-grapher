#!/bin/bash
echo "Starting System Monitor Backend..."
poetry install
poetry run uvicorn main:app --host 0.0.0.0 --port 8000 --reload 