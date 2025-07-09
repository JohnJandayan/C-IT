from celery import shared_task
import docker
import tempfile
from pathlib import Path

from .utils import create_gdb_script, parse_gdb_output_intelligently

@shared_task
def run_code_in_docker(code: str):
    client = docker.from_env()

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

        try:
            image, _ = client.images.build(path=str(temp_path), tag="c-it-runner", rm=True)
            
            container_output = client.containers.run(
                "c-it-runner",
                detach=False,
                remove=True,
                network_disabled=True,
                mem_limit="128m",
            )
            
            output = container_output.decode('utf-8')
            steps = parse_gdb_output_intelligently(output)
            return {"status": "SUCCESS", "steps": steps}

        except docker.errors.BuildError as e:
            return {"status": "ERROR", "error": "Docker build failed", "details": str(e)}
        except docker.errors.ContainerError as e:
            return {"status": "ERROR", "error": "Docker container failed", "details": str(e)}
        finally:
            try:
                client.images.remove("c-it-runner", force=True)
            except docker.errors.ImageNotFound:
                pass

    return {"status": "ERROR", "error": "An unexpected error occurred"} 