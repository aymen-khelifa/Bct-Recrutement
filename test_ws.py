import asyncio
import websockets

async def test():
    uri = 'wss://recrutement-backend-a5g6cbfvbfcgh3g6.germanywestcentral-01.azurewebsites.net/ws/signaling/test123'
    try:
        async with websockets.connect(uri) as websocket:
            print('Connected!')
            await websocket.send('{"type":"ready"}')
            print('Sent ready')
            await asyncio.sleep(1)
            print('Success')
    except Exception as e:
        print(f'Error: {e}')

asyncio.run(test())
