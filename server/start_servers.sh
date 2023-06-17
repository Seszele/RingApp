#!/bin/bash
./stop_servers.sh
uvicorn signaling_server:app --host 0.0.0.0 --port 8000 &
uvicorn server:app --host 0.0.0.0 --port 8080 &