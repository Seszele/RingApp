import React, { useState, useEffect, useRef } from "react";
import VideoComponent from "../webRTC/VideoComponent";
import BetterVideoComponent from "../webRTC/BetterVideoComponent";
import logo from "../../assets/logo.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import toast, { Toaster } from "react-hot-toast";
import { faLightbulb } from "@fortawesome/free-solid-svg-icons";

function showNotification(title: string, body: string) {
	if (!("Notification" in window)) {
		console.log("This browser does not support desktop notification");
	}
	else if (Notification.permission === "granted") {
		new Notification(title, { body });
	}
	else if (Notification.permission !== "denied") {
		Notification.requestPermission().then((permission) => {
			if (permission === "granted") {
				new Notification(title, { body });
			}
		});
	}
}

function askNotificationPermission() {
	if (!("Notification" in window)) {
		console.log("This browser does not support desktop notification");
	}
	else if (Notification.permission === "granted") {
		console.log("Permission granted");
	}
	else if (Notification.permission !== "denied") {
		Notification.requestPermission().then((permission) => {
			if (permission === "granted") {
				console.log("Permission granted");
			}
		});
	}
}

const MainView: React.FC = () => {
	const [light, setLight] = useState<boolean>(false);
	const [lightToast, setLightToast] = useState<string>();
	const [microphone, setMicrophone] = useState<boolean>(false);
	const [microphoneToast, setMicrophoneToast] = useState<string>();
	const [ws, setWs] = useState<WebSocket | null>(null);

	const wsRef = useRef<WebSocket | null>(null);

	useEffect(() => {
		askNotificationPermission();
		wsRef.current = new WebSocket('ws://192.168.0.69:8080/ws');

		wsRef.current.onopen = () => {
			console.log('WebSocket connected!');
		};

		wsRef.current.onmessage = (e) => {
			const message = e.data;
			if (message === "Button has been pressed.") {
				toast(
					<span>
						<FontAwesomeIcon icon="fas fa-bell"></FontAwesomeIcon> Przycisk został naciśnięty!
					</span>,
					{
						duration: 5000,
						style: {
							background: "#4B5563",
							color: "#F3F4F6",
						},
					}
				);
				showNotification("R.I.N.G.", "Przycisk został naciśnięty!");
			}
		};

		wsRef.current.onerror = (error) => {
			console.error(`WebSocket error: ${error}`);
		};

		wsRef.current.onclose = () => {
			console.log('WebSocket closed!');
		};

		setWs(wsRef.current);

		return () => {
			if (wsRef.current) {
				wsRef.current.close();
			}
		};
	}, []);

	function turnOnMicrophone() {
		setMicrophoneToast(
			toast(
				<span>
					<FontAwesomeIcon icon="fas fa-microphone"></FontAwesomeIcon> Uwaga -
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
		setMicrophone(true);
	}

	function turnOffMicrophone() {
		toast.dismiss(microphoneToast!);
		setMicrophone(false);
	}

	function turnOnLight() {
		if (ws) {
			ws.send(JSON.stringify({ light: "on" }));
		}
		setLightToast(
			toast(
				<span>
					<FontAwesomeIcon icon="fas fa-lightbulb"></FontAwesomeIcon> Uwaga -
					światło jest włączone!
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
		setLight(true);
	}

	function turnOffLight() {
		if (ws) {
			ws.send(JSON.stringify({ light: "off" }));
		}
		toast.dismiss(lightToast!);
		setLight(false);
	}

	function openDoors() {
		if (ws) {
			ws.send(JSON.stringify({ buzzer: "on" }));
		}
	}

	return (
		<div className="h-full flex flex-col bg-gray-900 text-white">
			<header className="bg-gray-800 p-4 flex items-center justify-center">
				<img src={logo} alt="Logo" className="w-32 mr-4" />
				<h1 className="text-3xl font-semibold">R.I.N.G.</h1>
			</header>
			<main className="p-4  flex flex-col items-center">
				<BetterVideoComponent />

				<div className="flex flex-wrap justify-center mt-24">
					{!light ? (
						<button
							className="bg-green-600 hover:bg-green-800 text-white font-bold py-2 px-4 rounded-full m-2 transition duration-300 ease-in-out transform "
							onClick={
								turnOnLight
							}
						>
							<FontAwesomeIcon icon={faLightbulb}></FontAwesomeIcon> Włącz
							światło
						</button>
					) : (
						<button
							className="bg-red-600 hover:bg-red-800 text-white font-bold py-2 px-4 rounded-full m-2 transition duration-300 ease-in-out transform "
							onClick={
								turnOffLight
							}
						>
							<FontAwesomeIcon icon={faLightbulb}></FontAwesomeIcon> Wyłącz
							światło
						</button>
					)
					}
					<button
						className="bg-green-600 hover:bg-green-800 text-white font-bold py-2 px-4 rounded-full m-2 transition duration-300 ease-in-out transform"
						onClick={openDoors}
					>
						<FontAwesomeIcon icon="fas fa-door-open"></FontAwesomeIcon> Odblokuj
						drzwi
					</button>
				</div>
			</main>
		</div>
	);
};

export default MainView;
