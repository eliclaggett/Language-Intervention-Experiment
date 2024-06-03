
# Imports
import os
import sys
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
from util.load_2023_data import loadChatLogs
from util.setup_model import device, model, tokenizer, streamer, generate_kwargs, generatePrompt, generate
import sys
 
# Globals
MODE = 'generate' # 'generate' or 'complete'

# KNOWLEDGEBASE
# For each user, store a sentence for each belief they state
beliefs = []
prompt_did_state_belief = 'Consider this message: "{{msg}}". Did this message state an opinion? Answer "yes" or "no".'
prompt_get_belief = 'Consider this message: "{{msg}}". What is the belief mentioned in this message? Start your answer by saying "The user agrees with" or "The user disagrees with" and finish with the belief mentioned in the message.'
# Yay, we know the user's belief


# CONVERSATION PLANNER
dialogue_acts = ['acknowledges my partner\'s opinions', 'asks a follow-up question', 'refutes my partner\'s claim', 'elaborates on my opinions', 'changes the subject', 'gives a greeting or goodbye']
prompt_next_da = 'You are an expert conversation analyzer. Here are the last few messages of a conversation between two users:\n\n"{{last_msgs}}"\n\nWhich of the following responses is the most appropriate for the next message? PICK ONE. These are your answer choices:\n{{response_str}}\nIf multiple of these strategies would be good, say "ANY".'
# Yay, we know the next dialogue act
prompt_generate_msg = 'Your task is to simulate the person "YOU" in a conversation about {{convo_topic}}{{belief_str}}. Here are the last few messages of the conversation:\n\n"{{last_msgs}}"\n\nSuggest a reply to the last message sent by "PARTNER" that {{dialogue_act}}.'

# Experiments to improve naturalness
prompt_generate_msg += """Always speak in a natural tone. This is a chat.
Example:
- Instead of: "I understand that must be difficult."
- Try: "Oh man, that sounds tough."


- Instead of saying "I am able to assist with that."
- Try: "Sure, I can help out!"
"""

prompt_generate_completion = prompt_generate_msg + ' Start the reply with this unfinished sentence: "{{unfinished_sentence}}" and complete it.'
# Yay, we have generated a message

# OPINION SOLICITER
# If 90sec pass with no messages, proactively solicit opinions from the more quiet person in the pair


# FUNCTIONS
def format_prompt(prompt, args):
    formatted = f'GPT4 Correct User: {prompt}\n\nGPT4 Correct Assistant: '
    for arg,val in args.items():
        formatted = formatted.replace('{{'+arg+'}}', str(val))
    return formatted

def run_model(prompt, args, model_args={}, skip_prompt=True):
    prompt = format_prompt(prompt, args)
    output = generate(prompt, model_args)
    output = tokenizer.batch_decode(output)[0]
    if skip_prompt:
        output = output[len(prompt):]
    return output

def run_ai_analysis(msg_history):
    # Run everything but generate autocomplete when we send a msg
    # Run everything including autocomplete when partner sends a message
    # TODO: Run autocomplete by itself when we type

    # Chat log string
    chat_log = ''
    for msg in msg_history:
        if msg['user'] == 0:
            chat_log += 'YOU: ' + msg['msg'] + '\n\n'
        else:
            chat_log += 'PARTNER: ' + msg['msg'] + '\n\n'

    # Check if the last msg stated a belief. If so, add it to the knowledgebase
    did_state_belief = run_model(prompt_did_state_belief, {
        'msg': msg_history[-1]['msg']
    }, dict( max_new_tokens=3 ))

    if did_state_belief.strip().lower()[0:3] == 'yes':
        extracted_belief = run_model(prompt_get_belief, {
            'msg': msg_history[-1]['msg']
        }, dict(max_new_tokens=64))
        
        extracted_belief = extracted_belief[0:extracted_belief.find('.')].strip()
        if extracted_belief.find('disagrees') > -1:
            extracted_belief = extracted_belief[extracted_belief.find('disagrees'):]
        else:
            extracted_belief = extracted_belief[extracted_belief.find('agrees'):]
        extracted_belief = extracted_belief.replace('grees', 'gree')
        
        beliefs.append({'user': msg_history[-1]['user'], 'belief': extracted_belief})
    

    if msg_history[-1]['user'] == 1:
        # Check what type of message should be sent next
        da_options = ''
        da_idx = 'A'
        for da in dialogue_acts:
            da_options += f'{da_idx}: {da}\n'
            da_idx = chr(ord(da_idx)+1)
        next_msg_type = run_model(prompt_next_da, {
            'last_msgs': chat_log,
            'response_str': da_options
        }, dict(max_new_tokens=24))
        da = re.search(r'([A-Z])\W', next_msg_type).group(1)
        da = ord(da) - ord('A')

        # Generate a message consistent with the user's beliefs that fits appropriately in the conversation.
        belief_str = ''
        if len(beliefs) > 0:
            for belief in beliefs:
                if belief['user'] == 1 - msg_history[-1]['user']:
                    if len(belief_str) > 10:
                        belief_str += ' and '
                    else:
                        belief_str += ' and you '
                    belief_str += belief['belief']

        next_msg = run_model(prompt_generate_msg, {
            'convo_topic': 'gun rights',
            'belief_str': belief_str,
            'last_msgs': chat_log,
            'dialogue_act': dialogue_acts[da]
        }, dict(max_new_tokens=64))
        next_msg = next_msg.strip()
        if next_msg[0] == '"':
            next_msg = next_msg[1:]
            next_msg = next_msg[0:next_msg.find('"')]


        if next_msg.find(':') > -1:
            next_msg = next_msg[next_msg.find(':')+2:]
        
        sentences = re.findall(r'[^\.!\?]+[\.!\?]', next_msg)
        if len(sentences) > 2:
            next_msg = ''.join(sentences[0:2])
        
        next_msg = next_msg[:re.search(r'[\.!\?]', next_msg).end()+1]

        return next_msg
    return ''

# simulate 2 person convo
user = 0
while True:
    msg_history = []
    if user == 0:
        next_msg = input(f'YOU: ')
    else:
        next_msg = input(f'PARTNER: ')
    msg_history.append({'user': user, 'msg': next_msg})
    suggestion = run_ai_analysis(msg_history)
    if user == 1:
        print(f'Suggestion: {suggestion}')

    user = 1 - user