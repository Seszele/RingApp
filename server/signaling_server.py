import time
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import json
from aiortc import RTCPeerConnection, RTCSessionDescription, VideoStreamTrack, RTCIceCandidate, RTCIceServer, RTCConfiguration
import cv2
import logging
import re
import asyncio
from av import VideoFrame
from aiortc.mediastreams import MediaStreamTrack
from fractions import Fraction

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


class CameraVideoStreamTrack(MediaStreamTrack):
    kind = "video"

    def __init__(self):
        super().__init__()
        self.cap = cv2.VideoCapture(0)
        self.timeframe = 60
        # self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1920)
        # self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 1080)

    async def recv(self):
        if self.cap is None:
            self.cap = cv2.VideoCapture(0)

        ret, frame = self.cap.read()
        if not ret:
            print("Could not read frame")
            return None

        frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        video_frame = VideoFrame.from_ndarray(frame, format="rgb24")
        video_frame.time_base = Fraction(1, self.timeframe)
        video_frame.pts = int(time.time() * self.timeframe)

        return video_frame

    def release(self):
        if self.cap is not None and self.cap.isOpened():
            self.cap.release()
            self.cap = None


def create_rtccandidate(data):
    raw_candidate = data['candidate']['candidate']
    sdp_mid = data['candidate']['sdpMid']
    sdp_mline_index = data['candidate']['sdpMLineIndex']
    username_fragment = data['candidate']['usernameFragment']

    pattern = re.compile(
        r"candidate:(?P<foundation>\S+)\s"
        r"(?P<component>\d+)\s"
        r"(?P<protocol>\S+)\s"
        r"(?P<priority>\d+)\s"
        r"(?P<ip>\S+)\s"
        r"(?P<port>\d+)\s"
        r"typ\s"
        r"(?P<type>\S+)"
    )

    match = pattern.match(raw_candidate)
    if not match:
        raise ValueError("Invalid candidate string")

    groups = match.groupdict()

    candidate = RTCIceCandidate(
        component=int(groups["component"]),
        foundation=groups["foundation"],
        ip=groups["ip"],
        port=int(groups["port"]),
        priority=int(groups["priority"]),
        protocol=groups["protocol"],
        type=groups["type"],
        sdpMid=sdp_mid,
        sdpMLineIndex=sdp_mline_index,
    )

    return candidate


@app.websocket("/signaling/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket.accept()
    clients.append(websocket)
    print("clients connected: ", clients)

    ice_servers = [
        RTCIceServer(urls="stun:stun.services.mozilla.com"),
        RTCIceServer(urls="stun:stun.l.google.com:19302"),
        RTCIceServer(urls="stun:stun1.l.google.com:19302"),
        RTCIceServer(urls="stun:stun2.l.google.com:19302"),
    ]

    config = RTCConfiguration(iceServers=ice_servers)
    pc = RTCPeerConnection(config)
    video_track = CameraVideoStreamTrack()
    pc.addTrack(video_track)

    @pc.on("track")
    def on_track(track):
        print("Track received")

    def on_icecandidate(candidate):
        print("Sending ICE candidate")
        if candidate:
            print(candidate)
            websocket.send_text(json.dumps(
                {"type": "candidate", "candidate": candidate.___dict___}))

    pc.on("icecandidate", lambda candidate: asyncio.ensure_future(
        on_icecandidate(candidate)))

    async def handle_offer(data):
        await pc.setRemoteDescription(RTCSessionDescription(type=data["type"], sdp=data["sdp"]))

        answer = await pc.createAnswer()

        # print(f"Answer type: {answer.type}")
        # print(f"Answer SDP: {answer.sdp}")

        await pc.setLocalDescription(answer)

        # logger.debug("KUPKAUWU")

        return {
            "type": "answer",
            "sdp": pc.localDescription.sdp,
        }

    async def handle_candidate(candidate_data):
        # candidate_data = candidate_data['candidate']
        candidate = create_rtccandidate(candidate_data)
        await pc.addIceCandidate(candidate)
        logger.debug(candidate)
        logger.debug("dodano kandydata")
        # send the cadidate to the other peer (temp)
        # await websocket.send_text(candidate_data)
        # logger.debug("wyslano kandydata")

    try:
        while True:
            message = await websocket.receive_text()
            data = json.loads(message)
            if data["type"] == "offer":
                answer = await handle_offer(data)
                await websocket.send_text(json.dumps(answer))
            elif data["type"] == "candidate":
                await handle_candidate(data)
    except Exception as e:
        print(f"Client {client_id} disconnected: {str(e)}")
    finally:
        video_track.release()
        if websocket in clients:
            clients.remove(websocket)
        await websocket.close()
        await pc.close()
