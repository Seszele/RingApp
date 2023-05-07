import React, { useState } from "react";
import VideoComponent from "../webRTC/VideoComponent";
import logo from "../../assets/logo.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import toast, { Toaster } from "react-hot-toast";

const MainView: React.FC = () => {
	const [light, setLight] = useState<boolean>(false);
	const [lightToast, setLightToast] = useState<string>();
	const [microphone, setMicrophone] = useState<boolean>(false);
	const [microphoneToast, setMicrophoneToast] = useState<string>();

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
		toast.dismiss(lightToast!);
		setLight(false);
	}

	return (
		<div className="h-full flex flex-col bg-gray-900 text-white">
			<header className="bg-gray-800 p-4 flex items-center justify-center">
				<img src={logo} alt="Logo" className="w-32 mr-4" />
				<h1 className="text-3xl font-semibold">R.I.N.G.</h1>
			</header>
			<main className="p-4">
				<VideoComponent />
				<div className="mt-4 flex flex-wrap justify-center">
        { !light ? (
					<button
						className="bg-green-600 hover:bg-green-800 text-white font-bold py-2 px-4 rounded-full m-2 transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-110"
						onClick={
              turnOnLight
						}
					>
						<FontAwesomeIcon icon="fas fa-lightbulb"></FontAwesomeIcon> Włącz
						światło
					</button>
          ) : (
            <button
						className="bg-red-600 hover:bg-red-800 text-white font-bold py-2 px-4 rounded-full m-2 transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-110"
						onClick={
							turnOffLight
						}
					>
						<FontAwesomeIcon icon="fas fa-lightbulb"></FontAwesomeIcon> Wyłącz
						światło
					</button>
          )
        }


					{!microphone ? (
						<button
							className="bg-green-600 hover:bg-green-800 text-white font-bold py-2 px-4 rounded-full m-2 transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-110"
							onClick={turnOnMicrophone}
						>
							<FontAwesomeIcon icon="fas fa-microphone"></FontAwesomeIcon> Włącz
							Mikrofon
						</button>
					) : (
						<button
							className="bg-red-600 hover:bg-red-800 text-white font-bold py-2 px-4 rounded-full m-2 transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-110"
							onClick={turnOffMicrophone}
						>
							<FontAwesomeIcon icon="fas fa-microphone-slash"></FontAwesomeIcon>{" "}
							Wyłącz Mikrofon
						</button>
					)}
					<button
						className="bg-green-600 hover:bg-green-800 text-white font-bold py-2 px-4 rounded-full m-2 transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-110"
						onClick={() => {
							/* Handle door unlock here */
						}}
					>
						<FontAwesomeIcon icon="fas fa-door-open"></FontAwesomeIcon> Odblokuj
						drzwi
					</button>
				</div>
			</main>
			<Toaster position="top-center" reverseOrder={false} />
		</div>
	);
};

export default MainView;
