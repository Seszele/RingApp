from array import array
import av
from aiortc.contrib.media import MediaStreamError
import pyaudio
import numpy as np
import wave
import sounddevice as sd
from fractions import Fraction
from aiortc.mediastreams import MediaStreamTrack
from av import VideoFrame, AudioFrame
import asyncio
import re
import logging
import cv2
from aiortc import RTCPeerConnection, RTCSessionDescription, VideoStreamTrack, RTCIceCandidate, RTCIceServer, RTCConfiguration
import json
from typing import List
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, WebSocket
import time
import fractions
import os
os.environ['PULSE_SERVER'] = '/run/user/1000/pulse/native'

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
        self.stream = sd.OutputStream(
            samplerate=self.samplerate, channels=self.channels, dtype=np.int16)
        self.stream.start()

    def play(self, audio_frame: AudioFrame):
        if isinstance(audio_frame, AudioFrame):
            audio_data = np.squeeze(audio_frame.to_ndarray())
            audio_data = audio_data.reshape(-1, self.channels)
            self.stream.write(audio_data)

    def close(self):
        self.stream.stop()
        self.stream.close()


# TODO change to 1
# Initialize player
player = SoundDevicePlayer(samplerate=24000, channels=1)


class MicrophoneAudioStreamTrack(MediaStreamTrack):
    kind = "audio"

    def __init__(self):
        super().__init__()  # don't forget this!
        self.p = pyaudio.PyAudio()
        self.rate = 24000
        self.stream = self.p.open(
            format=pyaudio.paInt16,
            channels=1,
            rate=self.rate,
            input=True,
            frames_per_buffer=1920,
        )
        # Set up .wav file recording
        self.wf = wave.open('output.wav', 'wb')
        self.wf.setnchannels(1)
        self.wf.setsampwidth(self.p.get_sample_size(pyaudio.paInt16))
        self.wf.setframerate(self.rate)

        self.output_container = av.open('output_frames.wav', 'w')
        self.audio_stream = self.output_container.add_stream(
            'pcm_s16le', self.rate)

    async def recv(self):

        try:
            data = self.stream.read(1920)
            # self.wf.writeframes(data)
            frame = AudioFrame.from_ndarray(np.frombuffer(
                data, np.int16).reshape(-1, 1).transpose(), layout="mono")

            frame.pts = int(time.time() * self.rate)
            frame.sample_rate = self.rate
            frame.time_base = fractions.Fraction(1, self.rate)

            audio_data = np.squeeze(frame.to_ndarray())
            audio_data = audio_data.reshape(-1, 1)
            self.wf.writeframes(audio_data)

            # player.play(frame)
            self.audio_stream.encode(frame)
        except Exception as e:
            print(e)

        return frame

    def stop(self):
        for packet in self.audio_stream.encode():
            self.output_container.mux(packet)
        self.output_container.close()
        # Call this function when you're done recording
        self.stream.stop_stream()
        self.stream.close()
        self.p.terminate()
        self.wf.close()


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
    # video_track = CameraVideoStreamTrack()
    # pc.addTrack(video_track)
    audio_track = MicrophoneAudioStreamTrack()
    pc.addTrack(audio_track)

    @pc.on("track")
    async def on_track(track):
        if track.kind == "audio":
            while True:
                try:
                    frame = await track.recv()
                except:
                    print('No audio from client received')
                if isinstance(frame, AudioFrame):
                    player.play(frame)

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
            print(data["type"])
            if data["type"] == "offer":
                answer = await handle_offer(data)
                await websocket.send_text(json.dumps(answer))
            elif data["type"] == "candidate":
                await handle_candidate(data)
    except Exception as e:
        print(f"Client {client_id} disconnected: {str(e)}")
    finally:
        audio_track.stop()
        # video_track.release()
        if websocket in clients:
            clients.remove(websocket)
        await websocket.close()
        await pc.close()
