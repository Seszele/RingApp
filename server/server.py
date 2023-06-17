import asyncio
from gpiozero import LED, Buzzer, Button
from fastapi import FastAPI
from starlette.websockets import WebSocket, WebSocketDisconnect
from uvicorn import run
import json
from websockets.exceptions import WebSocketException

led = LED(4)
buzzer = Buzzer(18, active_high=False, initial_value=False)
button = Button(17)

app = FastAPI()
app.active_connections = set()

main_loop = None


@app.on_event("startup")
async def startup_event():
    global main_loop
    main_loop = asyncio.get_running_loop()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    app.active_connections.add(websocket)
    print(f"New connection Total connections: {len(app.active_connections)}")

    # Nasłuchuj wiadomości od klienta
    try:
        while True:
            data = await websocket.receive_text()
            data = json.loads(data)

            if "light" in data:
                if data["light"] == "on":
                    led.on()
                elif data["light"] == "off":
                    led.off()
                else:
                    await websocket.send_text("Nieznane polecenie dla światła.")

            elif "buzzer" in data:
                if data["buzzer"] == "on":
                    buzzer.on()
                    led.on()
                    # buzzer zostanie włączony na 5 sekund
                    await asyncio.sleep(5)
                    led.off()
                    buzzer.off()
                else:
                    await websocket.send_text("Nieznane polecenie dla buzzera.")

            else:
                await websocket.send_text("Nieznane polecenie.")
    except (WebSocketException, WebSocketDisconnect):
        if websocket in app.active_connections:
            app.active_connections.remove(websocket)
        print(
            f"Connection closed Total connections: {len(app.active_connections)}")

    # remove drom active connections when client disconnects
    if websocket in app.active_connections:
        app.active_connections.remove(websocket)


# Nasłuchuj na przycisk
def button_pressed():
    # Aby uniknąć błędów blokujących, korzystamy z asyncio.run_coroutine_threadsafe
    asyncio.run_coroutine_threadsafe(notify_clients(), main_loop)


# Powiadom klientów, że przycisk został naciśnięty
async def notify_clients():
    print("Button has been pressed.")
    for connection in app.active_connections:
        await connection.send_text("Button has been pressed.")


button.when_pressed = button_pressed
