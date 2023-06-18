# R.I.N.G Smart entry phone
## Project Description
Intelligent Intercom R.I.N.G is a project that leverages the power of WebRTC for real-time communication. The system is hosted on a Raspberry Pi 4 and allows for functionalities such as video calling, door access control (via a buzzer), and light control (via LEDs). The client-side application is built with React.js and styled with Tailwind.css.

The device setup consists of a Raspberry Pi 4b, a Pi Camera 2, a buzzer, a button, and LEDs.

## Hardware Setup
To replicate the hardware setup, you will need the following components:

- Raspberry Pi 4b
- Pi Camera 2
- Buzzer
- Button
- LEDs

Connect these components as per the standard Raspberry Pi GPIO layout. Ensure the Pi Camera is properly connected to the camera serial interface (CSI) port.

## Software Setup

The server-side application is written in Python and hosted on the Raspberry Pi. The client-side application is built with React.js and styled with Tailwind.css. Communication between the server and client is facilitated through WebRTC.

To run the software, follow these steps:

1. Clone the repository to your local machine using `git clone https://github.com/Seszele/RingApp.git`
2. Navigate to the project directory.
3. Install the necessary dependencies. `pip install -r requirements.txt`
4. Run the server-side application using the `./start_servers.sh`
5. Navigate to the client directory and install all required packages using `npm install`
6. Run the client-side application using `npm start`.

## Starting and Stopping Servers
To start the servers, run the `start_servers.sh` script. This script will start both the server-side application hosted on the Raspberry Pi and the client-side application.

To stop the servers, run the `stop_servers.sh` script. This will halt both the server-side and client-side applications.

## Notes
If you find the stream lagging and delayed, try changing the resolution of the stream in the `signaling_server.py` file. The default resolution is set to 640x480. You can change this to 320x240 or 160x120. The lower the resolution, the faster the stream will be.

## Authors
- [Wojciech Siwek](https://github.com/Seszele)
- [Piotr Ryczek](https://github.com/UhCyR9)
