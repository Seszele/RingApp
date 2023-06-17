import React, { useEffect, useState, useRef } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const VideoComponent: React.FC = () => {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [pc, setPc] = useState<RTCPeerConnection>(new RTCPeerConnection());
	const [websocket, setWebSocket] = useState<WebSocket>();
	const [visibility, setVisibility] = useState<string>("hidden");
	const [audioTrack, setAudioTrack] = useState<MediaStreamTrack>();

	useEffect(() => {
		setWebSocket(new WebSocket("ws://192.168.0.69:8000/signaling/ws/2"));
		console.log("Websocket created");
	}, []);

	useEffect(() => {
		navigator.mediaDevices.getUserMedia({ audio: true, video: false })
			.then(function (stream) {
				const audioTracks = stream.getAudioTracks();
				for (var i = 0; i < audioTracks.length; i++) {
					pc.addTrack(audioTracks[i], stream);
				}
			})
			.catch(function (err) {
				console.log('Błąd podczas uzyskiwania dostępu do mikrofonu: ' + err.name);
			});
	}, []);

	console.log(audioTrack);

	async function start() {
		setVisibility("visible");
		websocket!.onmessage = async (message) => {
			const data = JSON.parse(message.data);
			console.log("important Received message:", data);
			if (data.type === "answer") {
				await pc.setRemoteDescription(
					new RTCSessionDescription({ type: data.type, sdp: data.sdp })
				);
				// const answer = await pc.createAnswer();
				// await pc.setLocalDescription(answer);
			} else if (data.type === "candidate") {
				console.log("important Received ICE candidate");
				const candidate = new RTCIceCandidate(data.candidate);
				await pc.addIceCandidate(candidate);
			}
		};
		websocket!.onopen = () => {
			// const offer = await pc.createOffer(offerOptions);
			// await pc.setLocalDescription(offer);
			// websocket!.send(JSON.stringify({ type: "offer", sdp: offer.sdp }));
			console.log("important WebSocket opened");
		};

		websocket!.onclose = () => {
			console.log("important WebSocket closed");
		};

		websocket!.onerror = (error) => {
			console.error("important WebSocket error:", error);
		};

		pc.ontrack = (event) => {
			// Check if the video element already has a stream
			if (!videoRef.current!.srcObject) {
				videoRef.current!.srcObject = event.streams[0];
				// videoRef.current!.play(); // Ensure the video starts playing
			}
			console.log(event);
			if (event.track.kind === "audio") {
				setAudioTrack(event.track);
				videoRef.current!.srcObject = event.streams[0];
				// videoRef.current!.play();

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
		// check if the websocket is open
		if (websocket!.readyState === websocket!.OPEN) {
			websocket!.send(JSON.stringify({ type: "offer", sdp: offer.sdp }));
		}
		else {
			console.log("important Websocket is not open");
		}
	}

	return (
		<div className="flex flex-col items-center justify-center ">
			<div className="relative w-full max-w-2xl overflow-hidden rounded-lg">
				<video
					ref={videoRef}
					autoPlay
					playsInline
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
