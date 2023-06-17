from aiortc.contrib.media import MediaPlayer
import logging
from aiortc import (
    RTCPeerConnection,
    RTCSessionDescription,
)
import json
from typing import List
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, WebSocket

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
clients: List[WebSocket] = []

logger = logging.getLogger("uvicorn")
logger.setLevel(logging.DEBUG)


@app.websocket("/signaling/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket.accept()
    clients.append(websocket)
    print("clients connected: ", clients)

    pc = RTCPeerConnection()
    try:
        video_track = MediaPlayer("test2.mp4").video
        # audio_track = MediaPlayer("test.wav").audio
        pc.addTrack(video_track)
        # pc.addTrack(audio_track)
    except Exception as e:
        print(e)
        return

    async def handle_offer(data):
        await pc.setRemoteDescription(
            RTCSessionDescription(sdp=data["sdp"], type=data["type"])
        )
        answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        return {
            "type": "answer",
            "sdp": pc.localDescription.sdp,
        }

    try:
        while True:
            message = await websocket.receive_text()
            data = json.loads(message)
            if data["type"] == "offer":
                answer = await handle_offer(data)
                await websocket.send_text(json.dumps(answer))
    except Exception as e:
        print(f"Client {client_id} disconnected: {str(e)}")
    finally:
        # audio_track.stop()
        try:
            # video_track.release()
            if websocket in clients:
                clients.remove(websocket)
            await websocket.close()
            await pc.close()
        except Exception as e:
            print(e)
