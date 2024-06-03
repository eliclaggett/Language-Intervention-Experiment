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
prompt_generate_msg = 'Your task is to continue the discuss as the person labeled "YOU" in a text chat about {{convo_topic}}{{belief_str}}. Here are the last few messages of the discussion:\n\n"{{last_msgs}}"\n\nReply to the last message sent by PARTNER{{dialogue_act}}. Do not respond to the person labeled MODERATOR. {{linguistic_techniques}}'

# Experiments to improve naturalness
prompt_generate_msg += """ Always speak in a natural tone. Respond with a maximum of two sentences and do not say hi after the conversation has already started!

For example:
- Instead of: "I understand that must be difficult."
- Try: "Oh man, that sounds tough."

- Instead of saying "I am able to assist with that."
- Try: "Sure, I can help out!"
"""

prompt_generate_completion = prompt_generate_msg + ' Start the reply with this unfinished sentence: "{{unfinished_sentence}}" and complete it.'

prompt_rewrite_msg = 'You will be shown a conversation between two people and a moderator about {{convo_topic}}{{belief_str}}. Here are the last few messages of the discussion:\n\n"{{last_msgs}}"\n\nRephrase the last message: "{{final_msg}}". {{linguistic_techniques}} Make sure that the rephrasing is consistent with the intent of the original message and doesn\'t add extra information. Change as few words as possible.'
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
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "Your task is to simulate the user labeled \"YOU\" in the conversations shown to you."},
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

def run_ai_analysis(msg_history):
    # Run everything but generate autocomplete when we send a msg
    # Run everything including autocomplete when partner sends a message
    # TODO: Run autocomplete by itself when we type

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

    # Check if the last msg stated a belief. If so, add it to the knowledgebase
    if (msg_history[-1]['personId'] != -1 and False):
        did_state_belief = run_model(prompt_did_state_belief, {
            'msg': msg_history[-1]['txt']
        }, dict( max_new_tokens=3, streamer=None ))

        if did_state_belief.strip().lower()[0:3] == 'yes':
            extracted_belief = run_model(prompt_get_belief, {
                'msg': msg_history[-1]['txt']
            }, dict(max_new_tokens=64, streamer=None))
            
            extracted_belief = extracted_belief[0:extracted_belief.find('.')].strip()
            if extracted_belief.find('disagrees') > -1:
                extracted_belief = extracted_belief[extracted_belief.find('disagrees'):]
            else:
                extracted_belief = extracted_belief[extracted_belief.find('agrees'):]
            extracted_belief = extracted_belief.replace('grees', 'gree')
            
            beliefs.append({'participantId': msg_history[-1]['sender'], 'belief': extracted_belief})
    return ''

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

def run_ai_autocomplete(msg_history, topic, pairType, topicAgree, treatmentMode, pairId):
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

        # Check what type of message should be sent next
        # da_options = ''
        # da_idx = 'A'
        # for da in dialogue_acts:
        #     da_options += f'{da_idx}: {da}\n'
        #     da_idx = chr(ord(da_idx)+1)
        # next_msg_type = run_model(prompt_next_da, {
        #     'last_msgs': chat_log_end,
        #     'response_str': da_options
        # }, dict(max_new_tokens=24, streamer=None))
        # if (len(da) >= 1):
        #     da = re.search(r'([A-Z])\W', next_msg_type)
        #     if da:
        #         da = da.group(1)
        #         da = ord(da) - ord('A')
        #     else:
        #         da = 1
        # else:
        #     da = 1

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

        print(f'Generating completion for {pairId}...', flush=True)

        next_msg = run_model(prompt_generate_msg, {
            'convo_topic': topics[topic],
            'last_msgs': chat_log,
            'belief_str': '',
            'dialogue_act': '',
            # 'belief_str': belief_str,
            # 'dialogue_act': ', ' + dialogue_acts[da],
            'linguistic_techniques': getLinguisticTechniques(pairType, topicAgree, topic)
        }, dict(max_new_tokens=64, streamer=None))
        
        # next_msg = ''
        # for new_token in streamer:
        #     next_msg += new_token
        #     yield new_token
        #     if new_token == '</s>':
        #         break
        print(f'DONE Generating completion for {pairId}', flush=True)
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
    # TODO: Implement autocomplete prompts
    # if TREATMENT_TYPE == 'supportive':
    #     system_msg = 'You are an intelligent assistant that suggests a way to complete a sentence and you respond empathetically and softly to all opposing viewpoints. You always use a friendly and casual tone. You also may suggest different perspectives, but do so in a gentle  You avoid assertions and arguments. Be supportive and nice! This is the assigned discussion topic:'
    #     # example_reply = sampleMsgs[2]['content'][0:2] + ' and I\'d love to hear your opinion!'
    # elif TREATMENT_TYPE == 'argumentative':
    #     system_msg = 'You are an intelligent assistant that suggests a way to complete a sentence and you always argue with the opinions of others. You may disregard the tone of your speech. You should focus on winning the argument and convincing the other parties of your perspective. Do not apologize. This is the assigned discussion topic:'
        # example_reply = sampleMsgs[2]['content'][0:2] + ' and I totally disagree with you.'

    # nextSentenceCtx = ' '.join(sampleMsgs[2]['content'].split(' ')[0:CONTEXT_LEN])
    # initial_prompt = f"Context: \"{sampleMsgs[0]['content']} {sampleMsgs[1]['content']}\". Reply to the previous messages by completing the sentence: \"{nextSentenceCtx}\"" # Moderator introduction of the chat topic and first part of human reply
# ------------------------------------------
idx = 0

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

async def process_item(name, item):
    global queue
    data = item['data']
    websocket = item['websocket']

    print(f'{name} received a command to "{data.command}" for {data.pairId}!', flush=True)

    if data.command == 'autocomplete':
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
            # for partial_reply in run_ai_autocomplete(msgHistory, topic, pairType, topicAgree, MODE, pairId):
            #     await websocket.send(json.dumps({'partial_reply': partial_reply, 'idx': idx}))
            output = run_ai_autocomplete(msgHistory, topic, pairType, topicAgree, MODE, pairId)
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
            # for partial_reply in run_ai_autocomplete(msgHistory, topic, pairType, topicAgree, MODE, pairId):
            #     await websocket.send(json.dumps({'partial_reply': partial_reply, 'idx': idx}))
            output = run_ai_rewrite(data.history, topic, pairType, topicAgree, MODE, pairId)
            await websocket.send(json.dumps({'partial_reply': output, 'idx': idx}))

        await websocket.send(json.dumps({'partial_reply': '[EOS]', 'idx': idx}))
        if (pairId in pair_metadata):
            pair_metadata[pairId]['idx'] += 1
        queue.task_done()
    elif data.command == 'update_history':
        run_ai_analysis(data.msgHistory)
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
                    # newMsg.personId = data.personId
                    msgHistory.append(newMsg)
                    data.msgHistory = msgHistory
                    stuff = {'data': data, 'websocket': websocket}
                    await queue.put(stuff)
                await websocket.send(json.dumps({'success': True}))
            # Process "autocomplete" command
            if data.command == 'autocomplete':
                stuff = {'data': data, 'websocket': websocket}
                await queue.put(stuff)
            # Process "autocomplete" command
            if data.command == 'rewrite':
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