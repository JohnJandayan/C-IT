import subprocess
import tempfile
import re
from pathlib import Path
import sys
import json
import docker

from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from celery.result import AsyncResult
from .tasks import run_code_in_docker
from .utils import create_gdb_script, parse_gdb_output_intelligently
from django.views.decorators.csrf import csrf_exempt

# Create your views here.

@csrf_exempt
@api_view(['POST'])
def execute_code(request):
    code = request.data.get('code', '')
    if not code:
        return Response({"error": "No code provided"}, status=400)

    task = run_code_in_docker.delay(code)
    return Response({"task_id": task.id})

@api_view(['GET'])
def get_result(request, task_id):
    result = AsyncResult(task_id)
    response_data = {
        'task_id': task_id,
        'status': result.status,
        'result': result.result if result.successful() else None,
        'error': str(result.result) if result.failed() else None,
    }
    return Response(response_data)
