import React, { useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrophone, faMicrophoneSlash, faPause, faPlay, faSpinner } from '@fortawesome/free-solid-svg-icons';
import toast from 'react-hot-toast';

const BetterVideoComponent: React.FC = () => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [connected, setConnected] = useState(false);
    const [mute, setMute] = useState(true);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const pc = useRef<RTCPeerConnection | null>(null);
    const websocket = useRef<WebSocket | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [microphoneToast, setMicrophoneToast] = useState<string>();


    const connect = async () => {
        setIsConnecting(true);
        setMute(true);
        pc.current = new RTCPeerConnection();
        websocket.current = new WebSocket('ws://192.168.0.69:8000/signaling/ws/2');

        websocket.current.onopen = async () => {
            console.log('WebSocket is open');

            const offerOptions = {
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
            };
            const offer = await pc.current?.createOffer(offerOptions);
            await pc.current?.setLocalDescription(offer);
            websocket.current?.send(JSON.stringify({ type: 'offer', sdp: offer?.sdp }));
        };

        websocket.current.onerror = (error) => {
            console.error('WebSocket error:', error);
            toast.error("Nie udało się połączyć z serwerem. Spróbuj ponownie później.");
            setIsConnecting(false);
        };

        websocket.current.onmessage = async (message) => {
            const data = JSON.parse(message.data);

            if (data.type === 'answer') {
                await pc.current?.setRemoteDescription(new RTCSessionDescription(data));
            } else if (data.type === 'candidate') {
                const candidate = new RTCIceCandidate(data.candidate);
                await pc.current?.addIceCandidate(candidate);
            }
        };

        pc.current.ontrack = (event) => {
            console.log('Got remote track:', event.streams[0]);
            if (videoRef.current) {
                videoRef.current.srcObject = event.streams[0];
                // if already playing don't play again
                if (videoRef.current.paused)
                    videoRef.current.play().catch(_ => { });

                // set connecting state
                setTimeout(() => {
                    setIsConnecting(false);
                    setConnected(true);
                }, 1000);
            }
        };

        pc.current.onicecandidate = (event) => {
            if (event.candidate) {
                websocket.current?.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
            }
        };

        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then(function (stream) {
                const audioTracks = stream.getAudioTracks();
                for (var i = 0; i < audioTracks.length; i++) {
                    audioTracks[i].enabled = !mute;
                    pc.current?.addTrack(audioTracks[i], stream);
                }
                setLocalStream(stream);
            })
            .catch(function (err) {
                console.log('Błąd podczas uzyskiwania dostępu do mikrofonu: ' + err.name);
            });
    };

    const disconnect = () => {
        if (websocket.current) {
            websocket.current.close();
        }

        if (pc.current) {
            pc.current.close();
        }

        setConnected(false);
    };

    const muteMicrophone = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = false;
            });
        }
        setMute(true);
        toast.dismiss(microphoneToast!);
    };

    const unmuteMicrophone = () => {
        if (localStream) {
            console.log("");

            localStream.getAudioTracks().forEach(track => {
                track.enabled = true;
            });
        }
        setMute(false);
        setMicrophoneToast(
            toast(
                <span>
                    <FontAwesomeIcon icon={faMicrophone}></FontAwesomeIcon> Uwaga -
                    mikrofon jest włączony!
                </span>,
                {
                    duration: Infinity,
                    style: {
                        background: "#4B5563",
                        color: "#F3F4F6",
                    },
                }
            )
        );
    };

    return (
        <div className="flex flex-col w-full max-w-2xl relative  ">
            <video ref={videoRef} className="w-full max-w-2xl overflow-hidden rounded-lg aspect-video" autoPlay playsInline />
            <div className={`z-3 absolute top-0 left-0 w-full max-w-2xl flex items-center justify-center aspect-video  
            ${connected ? 'slide-down' : 'slide-up'}`}>
                <div className='flex items-center w-full h-full justify-center '>
                    <button
                        className={`z-3 flex items-center justify-center bg-teal-800 text-white w-full max-w-2xl h-full rounded-lg 
                    hover:bg-teal-900 transition-colors duration-200 
                    ${connected ? 'change-shape' : 'change-shape-reverse'}`}
                        onClick={connected ? disconnect : connect}
                    >
                        {connected ? <FontAwesomeIcon icon={faPause} size="2x" /> : (isConnecting ? <FontAwesomeIcon icon={faSpinner} size="2x" className={`${isConnecting ? "animate-spin" : ""}`} /> : <FontAwesomeIcon icon={faPlay} size="2x" />)}
                    </button>
                    <div className={` -z-50 absolute bottom-50px ${connected ? 'slide-in-x-left' : 'slide-out-x-left'}`}>
                        <button
                            className={` flex ml-2 items-center justify-center  ${mute ? "bg-red-600 hover:bg-red-800" : 'bg-teal-800 hover:bg-teal-900'} text-white w-12 h-12 rounded-full
                         transition-colors duration-200 -translate-x-full`}
                            onClick={mute ? unmuteMicrophone : muteMicrophone}
                        >
                            {mute ? <FontAwesomeIcon icon={faMicrophoneSlash} size="1x" /> : <FontAwesomeIcon icon={faMicrophone} size="1x" />}
                        </button>
                    </div>
                </div>
            </div>


        </div >
    );
};

export default BetterVideoComponent;
