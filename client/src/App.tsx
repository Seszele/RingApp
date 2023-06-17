import { Toaster } from "react-hot-toast";
import "./App.css";
import MainView from "./components/mainView/MainView";
import BetterVideoComponent from "./components/webRTC/BetterVideoComponent";
import BetterVideoComponent2 from "./components/webRTC/BetterVideoComponent2";

function App() {

	return (
		// <><Toaster position="top-center" reverseOrder={false} /><BetterVideoComponent /></>
		// <BetterVideoComponent2 />
		<><Toaster position="top-center" reverseOrder={false} /><MainView /></>

	);
}

export default App;
