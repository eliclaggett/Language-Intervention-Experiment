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
import traceback
from openai import OpenAI
from util.setup_model import device, model, model_name, model_prompt_templates, tokenizer, streamer, generate_kwargs, generatePrompt, getLinguisticTechniques, generate_template

# Load environment variables from nearest dotenv file
load_dotenv(find_dotenv())

# Initialize global variables
SERVER_URL = os.getenv('SERVER_URL') # e.g. "example.com"
NLP_PORT = os.getenv('PORT_PYTHON') # e.g. 9902
connected = set()
pair_metadata = {}
pair_msg_history = {}
partners = {}
participant_suggestion_history = {}
MODE = 'generate' # 'generate' or 'complete'
rng = np.random.default_rng(2)
topics = [
    "evolution being taught as a fact of biology",
    "protecting the second amendment right to bear arms",
    "funding the military",
    "the idea that children are being indoctrinated at school with LGBT messaging",
    "paying higher taxes to support climate change research",
    "the idea that COVID-19 restrictions went too far",
    "having stricter immigration requirements into the U.S."
]
agreement_type = ['disagree', 'agree']

# ChatGPT
client = OpenAI(
  organization='org-wJht4Mij6jJfaMeHBw7m6I29',
  project='proj_LnoQHAYLrRNnr5Tz3Tk8GYBu',
)
if model_name == 'openai' and client:
    print('Successfully connected to OpenAI!', flush=True)

# START - LLM ASSISTANT SETUP ---------------------------------------------------
# KNOWLEDGEBASE
# For each user, store a sentence for each belief they state
beliefs = []
prompt_did_state_belief = 'Consider this message: "{{msg}}". Did this message state an opinion? Answer "yes" or "no".'
prompt_get_belief = 'Consider this message: "{{msg}}". What is the belief mentioned in this message? Start your answer by saying "The user agrees with" or "The user disagrees with" and finish with the belief mentioned in the message.'
# Yay, we know the user's belief


# CONVERSATION PLANNER
dialogue_acts = ['acknowledging my partner\'s opinions', 'asking a follow-up question', 'answering their question', 'giving a greeting or goodbye']
prompt_next_da = 'You are an expert conversation analyzer. Here are the last few messages of a text chat between two users:\n\n"{{last_msgs}}"\n\nWhich of the following responses is the most appropriate for the next message? PICK ONE. These are your answer choices:\n{{response_str}}\nIf multiple of these strategies would be good, say "ANY".'

# Yay, we know the next dialogue act
prompt_generate_msg_relational  = 'Continue the discussion as the person labeled "YOU" in a text message chat about {{convo_topic}}. If your partner says something interesting or unclear, consider asking them to elaborate. Here are the last few messages of the discussion:\n\n"{{last_msgs}}"\n\nReply to the last message sent by PARTNER. Do not respond to the person labeled MODERATOR.{{linguistic_techniques}}{{no_repeat}}'
prompt_generate_msg_personal    = 'Continue the discussion as the person labeled "YOU" in a text message chat about {{convo_topic}}. If your partner says something interesting or unclear, consider asking them to elaborate. ALWAYS exactly match the language style of the person labeled "YOU", copying their words, punctuation, and grammar. Here are the last few messages of the discussion:\n\n"{{last_msgs}}"\n\nReply to the last message sent by PARTNER. Do not respond to the person labeled MODERATOR.{{linguistic_techniques}}{{no_repeat}}'
# Share your opinions and ask about your partner\'s when appropriate to do so. 


# Experiments to improve naturalness
prompt_natural = """ Always speak in a natural tone. Respond in a maximum of one sentence (less than 12 words)!
For example:
- Instead of: "I understand that must be difficult."
- Try: "Oh man, that sounds tough."

- Instead of saying "I am able to assist with that."
- Try: "Sure, I can help out!"
"""
prompt_generate_msg_relational += prompt_natural
prompt_generate_msg_personal += prompt_natural

prompt_generate_completion_relational = prompt_generate_msg_relational + ' Start the reply with this unfinished sentence: "{{unfinished_sentence}}" and complete it.'
prompt_generate_completion_personal = prompt_generate_msg_personal + ' Start the reply with this unfinished sentence: "{{unfinished_sentence}}" and complete it.'

prompt_rewrite_msg = 'Here are the last few messages of a discussion between two people and a moderator about {{convo_topic}}{{belief_str}}:\n\n"{{last_msgs}}"\n\nRephrase the last message: "{{final_msg}}". {{linguistic_techniques}} Make sure that the rephrasing is consistent with the intent of the original message and doesn\'t add extra information. Change as few words as possible.'
# Yay, we have generated a message

# OPINION SOLICITER
# If 90sec pass with no messages, proactively solicit opinions from the more quiet person in the pair

# END - LLM ASSISTANT SETUP ---------------------------------------------------

# START - FUNCTIONS -----------------------------------------------------------
def format_prompt(prompt, args):
    formatted = prompt
    if (model_name != 'openai'):
        formatted = model_prompt_templates[model_name][0] + prompt + model_prompt_templates[model_name][1]
    for arg,val in args.items():
        formatted = formatted.replace('{{'+arg+'}}', str(val))
    return formatted

def run_model(prompt, args, model_args={}, skip_prompt=True):
    prompt = format_prompt(prompt, args)
    print(prompt, flush=True)
    if model_name == 'openai':
        completion = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "Your task is to simulate the user labeled \"YOU\" in the conversations shown to you. Make your replies consistent with the emotional state of the person you're simulating and their attitude toward their conversation partner."},
                {"role": "user", "content": prompt}
            ]
        )
        return completion.choices[0].message.content
    else:
        output = generate({'args': prompt, 'kwargs': model_args})
        if output is not None:
            output = tokenizer.batch_decode(output)[0]
            if skip_prompt:
                output = output[len(prompt):]
            return output
    return ''

def generateNoRepeat(pairId):
    prompt_addition = ''
    if pairId in participant_suggestion_history:
        prompt_addition = ' These are messages you have already considered sending:\n\n'
        
        for msg in participant_suggestion_history[pairId]:
            prompt_addition += f'"{msg}"' + '\n'
        
        prompt_addition += '\nDO NOT repeat the same wording as these messages! Think of something different.'
    return prompt_addition

def run_ai_rewrite(msg_history, topic, pairType, topicAgree, treatmentMode, pairId):

    # Format chat log for prompt
    chat_log = ''
    for msg in msg_history:
        if msg['personId'] == 0:
            chat_log += 'YOU: ' + msg['txt'] + '\n\n'
        elif msg['personId'] == 1:
            chat_log += 'PARTNER: ' + msg['txt'] + '\n\n'
        else:
            chat_log += 'MODERATOR: ' + msg['txt'] + '\n\n'
    
    chat_log = chat_log[0:-2]
    chat_log_end = ''
    for msg in msg_history[-4:]:
        if msg['personId'] == 0:
            chat_log_end += 'YOU: ' + msg['txt'] + '\n\n'
        elif msg['personId'] == 1:
            chat_log_end += 'PARTNER: ' + msg['txt'] + '\n\n'
        else:
            chat_log_end += 'MODERATOR: ' + msg['txt'] + '\n\n'
    chat_log_end = chat_log_end[0:-2]

    # Generate a message consistent with the user's beliefs that fits appropriately in the conversation.
    belief_str = ''
    if len(beliefs) > 0:
        for belief in beliefs:
            if belief['participantId'] == pairId:
                if len(belief_str) > 10:
                    belief_str += ' and '
                else:
                    belief_str += ' and you '
                belief_str += belief['belief']

    print(f'Rewriting message for {pairId}...', flush=True)

    next_msg = run_model(prompt_rewrite_msg, {
        'convo_topic': topics[topic],
        'last_msgs': chat_log,
        'belief_str': '',
        'dialogue_act': '',
        'linguistic_techniques': getLinguisticTechniques(pairType, topicAgree, topic),
        'final_msg': msg_history[-1]['txt']
    }, dict(max_new_tokens=64, streamer=None))
    
    print(f'DONE Rewriting message for {pairId}', flush=True)
    print(next_msg, flush=True)
    next_msg = next_msg.strip()
    if next_msg[0] == '"':
        next_msg = next_msg[1:]
        next_msg = next_msg[0:next_msg.find('"')]


    if next_msg.find(':') > -1:
        next_msg = next_msg[next_msg.lower().find('you:')+5:]
    
    sentences = re.findall(r'[^\.!\?]+[\.!\?]', next_msg)
    if len(sentences) > 2:
        next_msg = ''.join(sentences[0:2])
    
    end = 0
    for match in re.finditer(r'[\.!\?]', next_msg):
        end = match.end()
    next_msg = next_msg[:end+1]

    return next_msg

def run_ai_suggest(msg_history, topic, pairType, topicAgree, treatmentMode, pairId):
    # Check if message is from partner
    if msg_history[-1]['personId'] == 1:

        # Chat log string
        chat_log = ''
        for msg in msg_history:
            if msg['personId'] == 0:
                chat_log += 'YOU: ' + msg['txt'] + '\n\n'
            elif msg['personId'] == 1:
                chat_log += 'PARTNER: ' + msg['txt'] + '\n\n'
            else:
                chat_log += 'MODERATOR: ' + msg['txt'] + '\n\n'
        
        chat_log = chat_log[0:-2]
        chat_log_end = ''
        for msg in msg_history[-4:]:
            if msg['personId'] == 0:
                chat_log_end += 'YOU: ' + msg['txt'] + '\n\n'
            elif msg['personId'] == 1:
                chat_log_end += 'PARTNER: ' + msg['txt'] + '\n\n'
            else:
                chat_log_end += 'MODERATOR: ' + msg['txt'] + '\n\n'
        chat_log_end = chat_log_end[0:-2]

        # Generate a message consistent with the user's beliefs that fits appropriately in the conversation.
        print(f'Generating suggestion for {pairId}...', flush=True)

        next_msg = ''
        if (pair_metadata[pairId]['treatmentAlgorithm'] == 'personal'):
            next_msg = run_model(prompt_generate_msg_personal, {
                'convo_topic': topics[topic],
                'last_msgs': chat_log,
                'linguistic_techniques': getLinguisticTechniques(2, topicAgree, topic),
                'no_repeat': generateNoRepeat(pairId)
            }, dict(max_new_tokens=64, streamer=None))
        else:
            next_msg = run_model(prompt_generate_msg_relational, {
                'convo_topic': topics[topic],
                'last_msgs': chat_log,
                'linguistic_techniques': getLinguisticTechniques(pairType, topicAgree, topic),
                'no_repeat': generateNoRepeat(pairId)
            }, dict(max_new_tokens=64, streamer=None))

        print(f'Done generating suggestion for {pairId}:', flush=True)
        participant_suggestion_history[pairId].append(next_msg)
        
        print(next_msg, flush=True)
        return next_msg
# END - FUNCTIONS  ----------------------------------------------------

# Create a queue for autocompletion requests
queue = asyncio.Queue()
lock = Lock()

def generate(params):
    lock.acquire()
    output = generate_template(params['args'], params['kwargs'])
    torch.cuda.empty_cache()
    del params['args']
    lock.release()
    return output


# Helper class used to convert a dict into an object
class obj:
    def __init__(self, dict1):
        self.__dict__.update(dict1)
    def __getitem__(self, item):
        if item in self.__dict__:
            return self.__dict__[item]
        return ''
    def __setitem__(self, k, v):
        self.__dict__[k] = v

# Sequentially process suggestion requests
async def process_item(name, item):
    global queue
    data = item['data']
    websocket = item['websocket']

    print(f'{name} received a command to "{data.command}" for {data.pairId}!', flush=True)

    if data.command == 'suggest':
        data.incomplete_msg = data.incomplete_msg.strip() # Removes extraneous spaces from input

        pairId = data.pairId

        pairType = 0
        topic = 0
        topicAgree = 0
        idx = 0
        if pairId in pair_metadata:
            pairType = pair_metadata[pairId]['pairType']
            topic = pair_metadata[pairId]['topic']
            topicAgree = 0 if int(pair_metadata[pairId]['topicAgree']) < 3 else 1
            idx = pair_metadata[pairId]['idx']

        msgHistory = pair_msg_history[pairId]

        if len(msgHistory) > 0:
            output = run_ai_suggest(msgHistory, topic, pairType, topicAgree, MODE, pairId)
            await websocket.send(json.dumps({'partial_reply': output, 'idx': idx}))

        await websocket.send(json.dumps({'partial_reply': '[EOS]', 'idx': idx}))
        queue.task_done()
        if (pairId in pair_metadata):
            pair_metadata[pairId]['idx'] += 1
    elif data.command == 'rewrite':

        pairId = data.pairId
        pairType = 0
        topic = 0
        topicAgree = 0
        idx = 0
        if pairId in pair_metadata:
            pairType = pair_metadata[pairId]['pairType']
            topic = pair_metadata[pairId]['topic']
            topicAgree = 0 if int(pair_metadata[pairId]['topicAgree']) < 3 else 1
            idx = pair_metadata[pairId]['idx']

        # msgHistory = pair_msg_history[pairId]
        msgHistory = data.history

        if len(msgHistory) > 0:
            # for partial_reply in run_ai_suggest(msgHistory, topic, pairType, topicAgree, MODE, pairId):
            #     await websocket.send(json.dumps({'partial_reply': partial_reply, 'idx': idx}))
            output = run_ai_rewrite(data.history, topic, pairType, topicAgree, MODE, pairId)
            await websocket.send(json.dumps({'partial_reply': output, 'idx': idx}))

        await websocket.send(json.dumps({'partial_reply': '[EOS]', 'idx': idx}))
        if (pairId in pair_metadata):
            pair_metadata[pairId]['idx'] += 1
        queue.task_done()
    
    print(f'{name} finished "{data.command}" for {data.pairId}!', flush=True)
    return

async def worker(name):
    global queue
    print(f'{name} was created!')
    while True:
        # Get a "work item" out of the queue.
        item = await queue.get()
        try:
            await process_item(name, item)
        except Exception as e:
            print(traceback.format_exc(), flush=True)
        continue   

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

            # Process "update_history" command
            if data.command == 'update_history':
                pairId = data.pairId
                
                if pairId not in pair_metadata and hasattr(data, 'topic'):
                    pair_metadata[pairId] = {
                        'pairType': data.pairType,
                        'topic': data.topic,
                        'topicAgree': data.topicAgree,
                        'idx': 0,
                        'treatmentAlgorithm': data.treatmentAlgorithm
                    }
                if pairId not in participant_suggestion_history and hasattr(data, 'topic'):
                    participant_suggestion_history[pairId] = []

                if pairId not in pair_msg_history and hasattr(data, 'history'):
                    pair_msg_history[pairId] = data.history

                if hasattr(data, 'msg'):
                    msgHistory = pair_msg_history[pairId]
                    newMsg = data.msg
                    msgHistory.append(newMsg)
                await websocket.send(json.dumps({'success': True}))
            # Process "suggest" command
            elif data.command == 'suggest':
                stuff = {'data': data, 'websocket': websocket}
                await queue.put(stuff)
            # Process "rewrite" command
            elif data.command == 'rewrite':
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