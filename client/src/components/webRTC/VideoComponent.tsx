import React, { useEffect, useState, useRef } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const VideoComponent: React.FC = () => {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [pc, setPc] = useState<RTCPeerConnection>(new RTCPeerConnection());
	const [websocket, setWebSocket] = useState<WebSocket>();
	const [visibility, setVisibility] = useState<string>("hidden");

	useEffect(() => {
		setWebSocket(new WebSocket("ws://raspberrypi:8000/signaling/ws/2"));
		console.log("Websocket created");
	}, []);

	async function start() {
		setVisibility("visible");
		websocket!.onmessage = async (message) => {
			const data = JSON.parse(message.data);
			console.log("Received message:", data);
			if (data.type === "answer") {
				await pc.setRemoteDescription(
					new RTCSessionDescription({ type: data.type, sdp: data.sdp })
				);
			} else if (data.type === "candidate") {
				console.log("Received ICE candidate");
				const candidate = new RTCIceCandidate(data.candidate);
				await pc.addIceCandidate(candidate);
			}
		};

		websocket!.onclose = () => {
			console.log("WebSocket closed");
		};

		websocket!.onerror = (error) => {
			console.error("WebSocket error:", error);
		};

		pc.ontrack = (event) => {
			// Check if the video element already has a stream
			if (!videoRef.current!.srcObject) {
				videoRef.current!.srcObject = event.streams[0];
				videoRef.current!.play(); // Ensure the video starts playing
			}
		};

		pc.onicecandidate = async (event) => {
			if (event.candidate) {
				websocket!.send(
					JSON.stringify({ type: "candidate", candidate: event.candidate })
				);
			}
		};

		const offerOptions = {
			offerToReceiveAudio: true,
			offerToReceiveVideo: true,
		};
		const offer = await pc.createOffer(offerOptions);
		await pc.setLocalDescription(offer);
		websocket!.send(JSON.stringify({ type: "offer", sdp: offer.sdp }));
	}

	return (
		<div className="flex flex-col items-center justify-center ">
			<div className="relative w-full max-w-2xl overflow-hidden rounded-lg">
				<video
					ref={videoRef}
					autoPlay
					playsInline
					muted
					style={{ visibility: visibility }}
					className="w-full h-auto object-cover object-center"
				/>
			</div>
			<button
				onClick={start}
				className="bg-blue-600 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded-full m-2 transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-110"
			>
				<FontAwesomeIcon icon="fa-solid fa-play" /> Start
			</button>
		</div>
	);
};

export default VideoComponent;
