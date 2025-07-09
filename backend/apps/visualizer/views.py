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

# Create your views here.

def create_gdb_script(executable_path, line_count):
    executable_path_str = str(executable_path).replace('\\', '/')
    script = f"file {executable_path_str}\n"
    # Set breakpoints on each line
    for i in range(1, line_count + 2):
        script += f"b {i}\n"
    script += "run\n"
    # After each break, print locals and continue
    for _ in range(line_count * 2): # more continues to ensure we finish
        script += "info locals\\n"
        script += "python\\n"
        script += "import re\\n"
        script += "gdb_output = gdb.execute('info locals', to_string=True)\\n"
        script += "for line in gdb_output.splitlines():\\n"
        script += "    match = re.search(r'(\\w+)\\s*=\\s*\\b(0x[0-9a-fA-F]+)\\b', line)\\n"
        script += "    if match:\\n"
        script += "        var_name, address = match.groups()\\n"
        script += "        try:\\n"
        script += "            gdb.execute(f'p *({address})', to_string=True)\\n"
        script += "        except gdb.error:\\n"
        script += "            pass\\n"
        script += "end\\n"
        script += "continue\\n"
    script += "quit\\n"
    return script

def parse_gdb_output_intelligently(output: str):
    steps = []
    raw_steps = []
    current_raw_step = None

    for line in output.splitlines():
        line = line.strip()
        if not line:
            continue
        
        # New step starts with a breakpoint line
        breakpoint_match = re.search(r"Breakpoint \d+,.*at .*:(\d+)", line)
        if breakpoint_match:
            if current_raw_step:
                raw_steps.append(current_raw_step)
            current_raw_step = {"line": int(breakpoint_match.group(1)), "variables": {}, "dereferenced": {}}
            continue
        
        if current_raw_step:
            # Check for dereferenced pointer output, e.g., $1 = { ... }
            deref_match = re.match(r"\$\d+\s*=\s*(\{.*\})", line)
            if deref_match:
                # This is a bit of a hack without knowing which var it was,
                # but we can store it and the frontend can decide how to use it
                if "structures" not in current_raw_step["dereferenced"]:
                    current_raw_step["dereferenced"]["structures"] = []
                current_raw_step["dereferenced"]["structures"].append(deref_match.group(1))
                continue

            var_match = re.match(r"(\w+)\s*=\s*(.*)", line)
            if var_match:
                name, value = var_match.groups()
                current_raw_step["variables"][name] = value.strip()

    if current_raw_step:
        raw_steps.append(current_raw_step)

    # Now, process raw steps to create intelligent, stateful steps
    last_vars = {}
    for raw_step in raw_steps:
        # Avoid duplicate steps on the same line if vars haven't changed
        if steps and steps[-1]['line'] == raw_step['line'] and json.dumps(last_vars) == json.dumps(raw_step['variables']):
            continue

        changed_vars = []
        for name, value in raw_step['variables'].items():
            if name not in last_vars or last_vars[name] != value:
                changed_vars.append({
                    "name": name, 
                    "value": value,
                    "previous": last_vars.get(name, "N/A")
                })
        
        steps.append({
            "line": raw_step['line'],
            "variables": raw_step['variables'],
            "dereferenced": raw_step.get('dereferenced', {}),
            "changed_vars": changed_vars
        })
        last_vars = raw_step['variables']

    return steps

def execute_in_docker(code: str):
    client = docker.from_env()

    # Create a temporary directory to store the code and scripts
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        code_path = temp_path / "main.c"
        gdb_script_path = temp_path / "gdb.script"
        
        with open(code_path, "w") as f:
            f.write(code)
        
        line_count = len(code.splitlines())
        gdb_script = create_gdb_script("/app/main", line_count)
        with open(gdb_script_path, "w") as f:
            f.write(gdb_script)

        # Dockerfile to create a minimal environment
        dockerfile_content = f"""
FROM gcc:latest
WORKDIR /app
COPY main.c .
COPY gdb.script .
RUN gcc -g -o main main.c
CMD ["gdb", "--batch", "-x", "gdb.script"]
"""
        dockerfile_path = temp_path / "Dockerfile"
        with open(dockerfile_path, "w") as f:
            f.write(dockerfile_content)

        # Build the docker image
        try:
            image, build_log = client.images.build(path=str(temp_path), tag="c-it-runner", rm=True)
        except docker.errors.BuildError as e:
            return {"error": "Docker build failed", "details": str(e)}

        # Run the container with the GDB script
        try:
            container_output = client.containers.run(
                "c-it-runner",
                detach=False,
                remove=True,
                network_disabled=True,
                mem_limit="128m",
            )
            
            output = container_output.decode('utf-8')
            steps = parse_gdb_output_intelligently(output)

        except docker.errors.ContainerError as e:
            return {"error": "Docker container failed", "details": str(e)}
        finally:
            # Cleanup: remove the image
            try:
                client.images.remove("c-it-runner", force=True)
            except docker.errors.ImageNotFound:
                pass # It might have failed to build

    return {"steps": steps}

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
