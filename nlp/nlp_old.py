import os
import json
import torch
import numpy as np
from threading import Thread, Lock
from dotenv import load_dotenv, find_dotenv
import os
from dotenv import load_dotenv, find_dotenv
import json
import ssl
import asyncio
import websockets
from websockets.server import serve
import re
from util.setup_model import device, model, tokenizer, streamer, generate_kwargs, generatePrompt

TREATMENT_MODE = 'full' # 'full' or 'partial'
CONTEXT_LEN = 2

# Load environment variables from nearest dotenv file
load_dotenv(find_dotenv())

rng = np.random.default_rng(2)

# Initialize global variables
SERVER_URL = os.getenv('SERVER_URL') # e.g. "example.com"
NLP_PORT = os.getenv('PORT_PYTHON') # e.g. 9902
connected = set()
pair_metadata = {}
pair_msg_history = {}


# Create a queue for autocompletion requests
queue = asyncio.Queue()
lock = Lock()

def generate(params):
    lock.acquire()
    model.generate(**params['args'], **params['kwargs'])
    torch.cuda.empty_cache()
    del params['args']
    lock.release()


# Function to generate model predictions.
def predict(messages):

    # model_inputs = tokenizer.apply_chat_template(messages, return_tensors='pt').to(device)
    
    
    enc = tokenizer(messages, return_tensors='pt', add_special_tokens=False)
    enc['input_ids'] = enc['input_ids'].to(device)
    enc['attention_mask'] = enc['attention_mask'].to(device)
    

    # model.generate(model_inputs, **generate_kwargs)
    t = Thread(target=generate, args=[{'args': enc, 'kwargs': generate_kwargs}])
    t.start()

    for new_token in streamer:
        yield new_token
        if new_token == '</s>':
            break

# Partial message generation prompts (autocompletion)
# elif TREATMENT_MODE == 'partial':
    # still need to implement autocomplete prompts
    # if TREATMENT_TYPE == 'supportive':
    #     system_msg = 'You are an intelligent assistant that suggests a way to complete a sentence and you respond empathetically and softly to all opposing viewpoints. You always use a friendly and casual tone. You also may suggest different perspectives, but do so in a gentle  You avoid assertions and arguments. Be supportive and nice! This is the assigned conversation topic:'
    #     # example_reply = sampleMsgs[2]['content'][0:2] + ' and I\'d love to hear your opinion!'
    # elif TREATMENT_TYPE == 'argumentative':
    #     system_msg = 'You are an intelligent assistant that suggests a way to complete a sentence and you always argue with the opinions of others. You may disregard the tone of your speech. You should focus on winning the argument and convincing the other parties of your perspective. Do not apologize. This is the assigned conversation topic:'
        # example_reply = sampleMsgs[2]['content'][0:2] + ' and I totally disagree with you.'

    # nextSentenceCtx = ' '.join(sampleMsgs[2]['content'].split(' ')[0:CONTEXT_LEN])
    # initial_prompt = f"Context: \"{sampleMsgs[0]['content']} {sampleMsgs[1]['content']}\". Reply to the previous messages by completing the sentence: \"{nextSentenceCtx}\"" # Moderator introduction of the chat topic and first part of human reply
# ------------------------------------------
idx = 0

# Helper class used to convert a dict into an object
class obj:
    def __init__(self, dict1):
        self.__dict__.update(dict1)


async def worker(name):
    global queue
    print(f'{name} was created!')
    while True:
        # Get a "work item" out of the queue.
        item = await queue.get()
        print(f'{name} received an item!')

        
        data = item['data']
        websocket = item['websocket']

        data.incomplete_msg = data.incomplete_msg.strip() # Removes extraneous spaces from input

        pairId = data.pairId

        pairType = 0
        topic = 0
        topicAgree = 0
        idx = 0
        if (pairId in pair_metadata):
            pairType = pair_metadata[pairId]['pairType']
            topic = pair_metadata[pairId]['topic']
            topicAgree = pair_metadata[pairId]['topicAgree']
            idx = pair_metadata[pairId]['idx']

        msgHistory = pair_msg_history[pairId]

        if (len(msgHistory) == 0):
            # Do not suggest messages if there is no chat history
            print('\n----------[NO MSG HISTORY]---------', flush=True)
            continue
        if (msgHistory[-1].personId != 2):
            # Do not suggest messages unless the last person to talk was the partner
            print('\n----------[LAST SENDER NOT PARTNER]---------', flush=True)
            continue

        chatLogStr = ''
        for msg in msgHistory:
            personId = 'YOU'
            if (msg.personId == 2):
                personId = 'PARTNER:'
            elif (msg.personId == -1):
                personId = 'MODERATOR:'
            chatLogStr += f'{personId}: {msg.txt}\n\n\n'

        # Make pairType == 2 for personalized AI prompt
        prompt = generatePrompt(chatLogStr, pairType, topic, topicAgree, TREATMENT_MODE)
        history = [{
            'role': 'user', 'content': prompt
        }]
        
        # if (history[-1]['role'] == 'user'):
        #     continue

        # ------------------------------------------
        # Full message generation history
        # if TREATMENT_MODE == 'full':
        #     history.append({
        #             "role": "user",
        #             "content": data.incomplete_msg
        #         })
        # # ------------------------------------------
        # # Partial message generation history (autocompletion)
        # elif TREATMENT_MODE == 'partial':
        #     history.append({
        #             "role": "user",
        #             "content": f"Context: \"{data.incomplete_msg}\". Reply to the previous messages by completing the sentence: \"{data.incomplete_msg}\""
        #         })
        
        # Generate autocompletion
        word = ''
        wait_for_closure = False
        lastMsgNoCaps = False
        punctuation_count = 0
        trimming = True
        for msg in reversed(msgHistory):
            if msg.personId != 2 and msg.personId != -1:
                if (not re.search(r'[A-Z]', msg.txt)):
                    lastMsgNoCaps = True
                break

        for partial_reply in predict(prompt):
            if lastMsgNoCaps:
                partial_reply = partial_reply.lower()
            
            if trimming:
                if partial_reply.find('\n') < 0:
                    trimming = False
                partial_reply = partial_reply.replace('\n', '')
            
            word += partial_reply
            if (partial_reply.find(' ') >= 0):
                
                if len(word) > 20:
                    # LLM Error condition: Generated nonsense word
                    break
                elif word.lower().find('partner:') != -1 or word.lower().find('you:') != -1:
                    # LLM Error condition: Improperly continuing the chat
                    break

                if (wait_for_closure and (partial_reply.find(')') >= 0 or partial_reply.find('>') >= 0 or partial_reply.find(']') >= 0)):
                    wait_for_closure = False
                elif partial_reply.find('(') >= 0 or partial_reply.find('<') >= 0 or partial_reply.find('[') >= 0:
                    wait_for_closure = True
                elif (not re.search(r'[0-9]+[A-Za-z]|[A-Za-z]+[0-9]', word) and word.isascii()):
                    await websocket.send(json.dumps({'partial_reply': word, 'idx': idx}))
                    if re.search(r'[^A-Z]\w+\.|\?|\!', partial_reply):
                        # Last word of sentence
                        break
                else:
                    break
            elif re.search(r'[^A-Z]\w+\.|\?|\!', partial_reply):
                # Last word
                await websocket.send(json.dumps({'partial_reply': word, 'idx': idx}))
            
            # Punctuation limit
            # if re.search(r'[^A-Z]\w+[\.\?\!]|^[\.\?\!]', word):
            #     punctuation_count += 1

            word = ''
            

        if (pairId in pair_metadata):
            pair_metadata[pairId]['idx'] += 1
        await websocket.send(json.dumps({'partial_reply': '[EOS]', 'idx': idx}))

        # Notify the queue that the "work item" has been processed.
        queue.task_done()
        print(f'{name} finished generating a thing!', flush=True)

# Function used to process connections from clients
async def handleInput(websocket):
    
    # Record that this client is connected
    global connected
    global pair_msg_history
    global pair_metadata
    global queue
    connected.add(websocket)
    
    # Process each message that the client sends
    try:
        async for message in websocket:
            # Messages are received in JSON format, e.g., {command: "do_something", data: "data"}
            data = json.loads(message, object_hook=obj)
            # print(data.__dict__)

            # Process "autocomplete" command
            if data.command == 'update_history':                
                pairId = data.pairId
                

                if pairId not in pair_metadata and hasattr(data, 'topic'):
                    pair_metadata[pairId] = {
                        'pairType': data.pairType,
                        'topic': data.topic,
                        'topicAgree': data.topicAgree,
                        'idx': 0
                    }

                if pairId not in pair_msg_history and hasattr(data, 'history'):
                    pair_msg_history[pairId] = data.history

                if hasattr(data, 'msg'):
                    msgHistory = pair_msg_history[pairId]
                    newMsg = data.msg
                    newMsg.personId = data.personId
                    
                    msgHistory.append(newMsg)
                await websocket.send(json.dumps({'success': True}))
            # Process "autocomplete" command
            if data.command == 'autocomplete':
                stuff = {'data': data, 'websocket': websocket}
                await queue.put(stuff)

    # Process when the client disconnects            
    except websockets.exceptions.ConnectionClosedError:    
        print('Connection closed')
    finally:
        connected.remove(websocket)

async def main():

    worker_task = asyncio.create_task(worker('worker-1'))

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