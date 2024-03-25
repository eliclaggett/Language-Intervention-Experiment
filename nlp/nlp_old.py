import torch
from transformers import pipeline
import os
from dotenv import load_dotenv, find_dotenv
import json
import ssl
import asyncio
import websockets
from websockets.server import serve

# Load environment variables from nearest dotenv file
load_dotenv(find_dotenv())

# Initialize variables
SERVER_URL = os.getenv('SERVER_URL') # e.g. "example.com"
NLP_PORT = os.getenv('PORT_PYTHON') # e.g. 9902
connected = set()

# Initialize language generation pipeline (AI model)
pipe = pipeline("text-generation", model="TinyLlama/TinyLlama-1.1B-Chat-v0.6")

# Helper class used to convert a dict into an object
class obj:
    def __init__(self, dict1):
        self.__dict__.update(dict1)

# Function used to process connections from clients
async def handleInput(websocket):
    
    # Record that this client is connected
    global connected
    connected.add(websocket)
    
    # Process each message that the client sends
    try:
        async for message in websocket:
            # Messages are received in JSON format, e.g., {command: "do_something", data: "data"}
            data = json.loads(message, object_hook=obj)
            
            # Process "autocomplete" command
            if data.command == 'autocomplete':
                data.incomplete_msg = data.incomplete_msg.strip() # Removes extraneous spaces from input
                system_msg = 'This is a conversation between two people about politics. It starts with a greeting. No one says their name.' # Initial prompt
                
                prompt =  system_msg + data.incomplete_msg
                
                # Generate autocompletion
                outputs = pipe(prompt, max_new_tokens=8, do_sample=True, temperature=0.3, top_k=50, top_p=0.95)
                
                # Save only the generated text
                generated_text = outputs[0]["generated_text"][len(system_msg):]

                # Send generated text to client 
                await websocket.send(json.dumps({'completion': generated_text}))

    # Process when the client disconnects            
    except websockets.exceptions.ConnectionClosedError:    
        print('Connection closed')
    finally:
        connected.remove(websocket)

async def main():

    # In the server, we use an encrypted connection
    if (os.getenv('DEPLOYMENT', default='prod') == 'prod'):
        ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ssl_context.load_cert_chain(f'/etc/letsencrypt/live/{SERVER_URL}/fullchain.pem', keyfile=f'/etc/letsencrypt/live/{SERVER_URL}/privkey.pem')
        
        async with serve(handleInput, "", NLP_PORT, ssl=ssl_context):
            print('Running secure websocket server on port {}...'.format(NLP_PORT))
            await asyncio.Future()  # run forever
    
    # During local development, we use an unencrypted connection
    else:
        async with serve(handleInput, "", NLP_PORT):
            print('Running websocket server on port {}...'.format(NLP_PORT))
            await asyncio.Future()  # run forever

# Run websocket server until we receive a keyboard interrupt
if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print('\nBye bye...')