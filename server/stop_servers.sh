#!/bin/bash

# Definiujemy ścieżki do procesów
process1="/home/pi/.local/bin/uvicorn signaling_server:app --host 0.0.0.0 --port 8000"
process2="/home/pi/.local/bin/uvicorn server:app --host 0.0.0.0 --port 8080"

# Szukamy procesów i zapisujemy ich PID
pid1=$(pgrep -f "$process1")
pid2=$(pgrep -f "$process2")

# Jeśli proces istnieje, zatrzymaj go
if [ ! -z "$pid1" ]
then
    echo "Zatrzymuję proces 1: $pid1"
    kill -9 $pid1
fi

if [ ! -z "$pid2" ]
then
    echo "Zatrzymuję proces 2: $pid2"
    kill -9 $pid2
fi
