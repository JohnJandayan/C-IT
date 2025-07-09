FROM gcc:latest

WORKDIR /app

# Install gdb
RUN apt-get update && apt-get install -y gdb

COPY . .

CMD ["/bin/bash"] 