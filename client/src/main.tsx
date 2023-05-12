import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { library } from '@fortawesome/fontawesome-svg-core';
import {  faLightbulb, faMicrophone, faDoorOpen, faPlay, faMicrophoneSlash, faBell } from '@fortawesome/free-solid-svg-icons';

library.add(faLightbulb, faMicrophone, faDoorOpen, faPlay, faMicrophoneSlash, faBell);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <App />
)
