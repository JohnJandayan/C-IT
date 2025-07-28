#!/bin/bash

# Install dependencies
pip install -r requirements-vercel.txt

# Collect static files
python manage.py collectstatic --noinput

# Run migrations
python manage.py migrate --noinput

echo "Build completed successfully!" 