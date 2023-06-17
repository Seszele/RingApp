import asyncio
import json
import logging
import os
import re
from typing import List

import numpy as np
import sounddevice as sd
from aiortc import RTCIceCandidate, RTCPeerConnection, RTCSessionDescription
from aiortc.contrib.media import MediaPlayer, MediaBlackhole
from av import AudioFrame, VideoFrame
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

os.environ["PULSE_SERVER"] = "/run/user/1000/pulse/native"

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


class SoundDevicePlayer:
    def __init__(self, samplerate, channels):
        self.samplerate = samplerate
        self.channels = channels
        self.stream = None
        self.device_available = self.check_output_device()
        if self.device_available:
            self.stream = sd.OutputStream(
                samplerate=self.samplerate, channels=self.channels, dtype=np.int16)
            self.stream.start()

    def check_output_device(self):
        devices = sd.query_devices(kind='output')
        if devices['index'] == 10:
            return False
        return len(devices) > 1

    def play(self, audio_frame: AudioFrame):
        if isinstance(audio_frame, AudioFrame):
            audio_data = np.squeeze(audio_frame.to_ndarray())
            audio_data = audio_data.reshape(-1, self.channels)
            self.stream.write(audio_data)

    def close(self):
        self.stream.stop()
        self.stream.close()


player = SoundDevicePlayer(samplerate=48000, channels=2)


def create_rtccandidate(data):
    raw_candidate = data["candidate"]["candidate"]
    sdp_mid = data["candidate"]["sdpMid"]
    sdp_mline_index = data["candidate"]["sdpMLineIndex"]
    username_fragment = data["candidate"]["usernameFragment"]

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


def check_microphone_device(device_name):
    devices = sd.query_devices()
    for device in devices:
        if device_name in device['name']:
            return True
    return False


@app.websocket("/signaling/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket.accept()
    clients.append(websocket)
    print("clients connected: ", clients)

    pc = RTCPeerConnection()
    try:
        video_track = MediaPlayer('/dev/video0', format='v4l2', options={
            'video_size': '640x360'
        }).video
        if check_microphone_device('hw:2,0'):
            audio_track = MediaPlayer('hw:2,0', format='alsa', options={
                'sample_rate': '48000',
                'channels': '1',
            }).audio
            if (audio_track is not None):
                pc.addTrack(audio_track)
        else:
            logger.warning("Audio device not found")

        pc.addTrack(video_track)
    except Exception as e:
        print(e)

    @pc.on("track")
    async def on_track(track):
        if track.kind == "audio":
            if player.device_available:
                logger.info("Audio device available. Playing audio...")
                while True:
                    try:
                        frame = await track.recv()
                    except Exception as e:
                        break
                    if isinstance(frame, AudioFrame):
                        try:
                            player.play(frame)
                        except Exception as e:
                            print(e)
                            logger.error("is not an instance")
            else:
                logger.warning(
                    "No output audio device available. Discarding audio...")
                blackhole = MediaBlackhole()
                blackhole.addTrack(track)
                await blackhole.start()

    @pc.on("close")
    async def on_close():
        print("Connection closed")
        await websocket.close()

    def on_icecandidate(candidate):
        print("Sending ICE candidate")
        if candidate:
            print(candidate)
            websocket.send_text(
                json.dumps(
                    {"type": "candidate", "candidate": candidate.___dict___})
            )

    pc.on(
        "icecandidate",
        lambda candidate: asyncio.ensure_future(on_icecandidate(candidate)),
    )

    async def handle_offer(data):
        await pc.setRemoteDescription(
            RTCSessionDescription(type=data["type"], sdp=data["sdp"])
        )

        answer = await pc.createAnswer()

        await pc.setLocalDescription(answer)

        return {
            "type": "answer",
            "sdp": pc.localDescription.sdp,
        }

    async def handle_candidate(candidate_data):
        candidate = create_rtccandidate(candidate_data)
        await pc.addIceCandidate(candidate)
        logger.debug(candidate)
        logger.debug("dodano kandydata")

    try:
        while True:
            message = await websocket.receive_text()
            data = json.loads(message)
            print(data["type"])
            if data["type"] == "offer":
                answer = await handle_offer(data)
                await websocket.send_text(json.dumps(answer))
            elif data["type"] == "candidate":
                await handle_candidate(data)
    except Exception as e:
        print(f"Client {client_id} disconnected: {str(e)}")
    finally:
        try:
            if websocket in clients:
                clients.remove(websocket)
            await websocket.close()
            await pc.close()
        except Exception as e:
            print(e)
