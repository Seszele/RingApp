import React, { useState, useEffect, useRef } from "react";
import BetterVideoComponent from "../webRTC/BetterVideoComponent";
import logo from "../../assets/logo.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import toast from "react-hot-toast";
import { faBell, faDoorOpen, faLightbulb } from "@fortawesome/free-solid-svg-icons";

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
						<FontAwesomeIcon icon={faBell}></FontAwesomeIcon> Przycisk został naciśnięty!
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

	function turnOnLight() {
		if (ws) {
			ws.send(JSON.stringify({ light: "on" }));
		}
		setLightToast(
			toast(
				<span>
					<FontAwesomeIcon icon={faLightbulb}></FontAwesomeIcon> Uwaga -
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
			<main className="p-4 flex items-center justify-center  mr-48">

				<div className="flex flex-col flex-wrap justify-center mr-12 ">

					<button
						className={`bg-green-600 hover:bg-green-800 ${light && "bg-red-600 hover:bg-red-800"} text-white font-bold py-4 px-5 rounded-full m-2 transition duration-300 ease-in-out transform `}
						onClick={light ? turnOffLight : turnOnLight}
					>
						<FontAwesomeIcon icon={faLightbulb} size="2xl"></FontAwesomeIcon>
					</button>
					<button
						className="bg-green-600 hover:bg-green-800 text-white font-bold py-4 px-4 rounded-full m-2 transition duration-300 ease-in-out transform"
						onClick={openDoors}
					>
						<FontAwesomeIcon icon={faDoorOpen} size="2xl"></FontAwesomeIcon>
					</button>
				</div>
				<BetterVideoComponent />
			</main>
		</div>
	);
};

export default MainView;
