"""
Static files handler for Vercel
"""

import os
from pathlib import Path

def static_handler(request, context):
    """Handle static file requests"""
    path = request.get('path', '')
    
    # Map common static file requests
    if path.startswith('/static/'):
        # For now, return a simple response
        return {
            'statusCode': 200,
            'body': 'Static file placeholder',
            'headers': {
                'Content-Type': 'text/plain'
            }
        }
    
    return {
        'statusCode': 404,
        'body': 'Not Found',
        'headers': {
            'Content-Type': 'text/plain'
        }
    } 