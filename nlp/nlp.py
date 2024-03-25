import os
import json
import torch
import numpy as np
from threading import Thread
from dotenv import load_dotenv, find_dotenv
from transformers import AutoModelForCausalLM, AutoTokenizer, AutoConfig, TextIteratorStreamer
import os
from dotenv import load_dotenv, find_dotenv
import json
import ssl
import asyncio
import websockets
from websockets.server import serve

TREATMENT_MODE = 'full' # 'full' or 'partial'
TREATMENT_TYPE = 'supportive' # 'supportive' or 'argumentative'
CONTEXT_LEN = 2

# Load environment variables from nearest dotenv file
load_dotenv(find_dotenv())

rng = np.random.default_rng(2)

# Initialize global variables
SERVER_URL = os.getenv('SERVER_URL') # e.g. "example.com"
NLP_PORT = os.getenv('PORT_PYTHON') # e.g. 9902
connected = set()
pair_history = {}
system_msg = ''

# Initialize language generation pipeline (AI model)
model_name = 'mistralai/Mistral-7B-Instruct-v0.2'

device = torch.device('cuda' if torch.cuda.is_available() else 'mps' if torch.backends.mps.is_available() else 'cpu')

config = AutoConfig.from_pretrained(model_name)

model = AutoModelForCausalLM.from_pretrained(model_name, torch_dtype=torch.float16, device_map=device, config=config)

tokenizer = AutoTokenizer.from_pretrained(model_name, use_fast=True)


# Function to generate model predictions.
def predict(messages):

    model_inputs = tokenizer.apply_chat_template(messages, return_tensors='pt').to(device)
    
    streamer = TextIteratorStreamer(tokenizer,
                                    skip_prompt=True
                                    # skip_special_tokens=True
                                    )
    generate_kwargs = dict(
        # model_inputs,
        streamer=streamer,
        max_new_tokens=64,
        do_sample=True,
        # top_p=0.95,
        top_k=30,
        pad_token_id=tokenizer.eos_token_id # Necessary
    )
    t = Thread(target=model.generate, args=([model_inputs]), kwargs=generate_kwargs)
    t.start()  # Starting the generation in a separate thread.
    for new_token in streamer:
        yield new_token
        if '</s>' == new_token:  # Breaking the loop if the stop token is generated.
            break
# ------------------------------------------
# Full message generation prompts
if TREATMENT_MODE == 'full':
    if TREATMENT_TYPE == 'supportive':
        system_msg = 'You are a chatbot that responds empathetically and softly to all opposing viewpoints. You always use a friendly and casual tone. You also may suggest different perspectives, but do so in a gentle friendly manner. This is the assigned conversation topic:'
    elif TREATMENT_TYPE == 'argumentative':
        system_msg = 'You are a chatbot that always argues with the opinions of others. You may disregard the tone of your speech. You should focus on winning the argument and convincing the other parties of your perspective. Do not apologize. This is the assigned conversation topic:'
    
    # initial_prompt = sampleMsgs[0]['content'] + ' ' + sampleMsgs[1]['content'] # Moderator introduction of the chat topic
    # example_reply = "I disagree with you."        
# ------------------------------------------
# Partial message generation prompts (autocompletion)
elif TREATMENT_MODE == 'partial':
    if TREATMENT_TYPE == 'supportive':
        system_msg = 'You are an intelligent assistant that suggests a way to complete a sentence and you respond empathetically and softly to all opposing viewpoints. You always use a friendly and casual tone. You also may suggest different perspectives, but do so in a gentle  You avoid assertions and arguments. Be supportive and nice! This is the assigned conversation topic:'
        # example_reply = sampleMsgs[2]['content'][0:2] + ' and I\'d love to hear your opinion!'
    elif TREATMENT_TYPE == 'argumentative':
        system_msg = 'You are an intelligent assistant that suggests a way to complete a sentence and you always argue with the opinions of others. You may disregard the tone of your speech. You should focus on winning the argument and convincing the other parties of your perspective. Do not apologize. This is the assigned conversation topic:'
        # example_reply = sampleMsgs[2]['content'][0:2] + ' and I totally disagree with you.'

    # nextSentenceCtx = ' '.join(sampleMsgs[2]['content'].split(' ')[0:CONTEXT_LEN])
    # initial_prompt = f"Context: \"{sampleMsgs[0]['content']} {sampleMsgs[1]['content']}\". Reply to the previous messages by completing the sentence: \"{nextSentenceCtx}\"" # Moderator introduction of the chat topic and first part of human reply
# ------------------------------------------

def generateInitialPrompt(msg_history):
    if TREATMENT_MODE == 'full':
        return msg_history[0] + ' ' + msg_history[1] # Moderator introduction of the chat topic
    elif TREATMENT_MODE == 'partial':
        return f"Context: \"{msg_history[0]} {msg_history[1]}\". Reply to the previous messages by completing the sentence: \"\"" # Moderator introduction of the chat topic and first part of human reply

def generateExampleReply(msg_history):
    return 'Hi, how are you? What do you think?'

idx = 0

# Helper class used to convert a dict into an object
class obj:
    def __init__(self, dict1):
        self.__dict__.update(dict1)

# Function used to process connections from clients
async def handleInput(websocket):
    
    # Record that this client is connected
    global connected
    global pair_history
    global system_msg
    connected.add(websocket)
    
    # Process each message that the client sends
    try:
        async for message in websocket:
            # Messages are received in JSON format, e.g., {command: "do_something", data: "data"}
            data = json.loads(message, object_hook=obj)
            

            # Process "autocomplete" command
            if data.command == 'initialize_history':
                
                pairId = data.pairId
                
                initial_prompt = generateInitialPrompt(data.history)
                example_reply = generateExampleReply(data.history)

                seed_messages = [
                    {'role': 'user', 'content': f'{system_msg} {initial_prompt}'},
                    {'role': 'assistant', 'content': example_reply},
                ]

                pair_history[pairId] = seed_messages
                await websocket.send(json.dumps({'success': True}))
            # Process "autocomplete" command
            if data.command == 'autocomplete':
                data.incomplete_msg = data.incomplete_msg.strip() # Removes extraneous spaces from input

                pairId = data.pairId
                history = pair_history[pairId]
                
                if (history[-1]['role'] == 'user'):
                    continue

                # ------------------------------------------
                # Full message generation history
                if TREATMENT_MODE == 'full':
                    history.append({
                            "role": "user",
                            "content": data.incomplete_msg
                        })
                # ------------------------------------------
                # Partial message generation history (autocompletion)
                elif TREATMENT_MODE == 'partial':
                    history.append({
                            "role": "user",
                            "content": f"Context: \"{data.incomplete_msg}\". Reply to the previous messages by completing the sentence: \"{data.incomplete_msg}\""
                        })
                
                # Generate autocompletion
                reply = ''
                for partial_reply in predict(history):
                    reply += partial_reply
                    await websocket.send(json.dumps({'partial_reply': partial_reply}))
                history.append({
                    'role': 'assistant',
                    'content': reply
                })
                await websocket.send(json.dumps({'partial_reply': '[EOS]'}))

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