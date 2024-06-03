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
from util.setup_model import device, model, tokenizer, streamer, generate_kwargs, generatePrompt
import sys
 

# Do I need this?
# PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True
TREATMENT_MODE = 'full' # 'full' or 'partial'
CONTEXT_LEN = 2


class obj:
    def __init__(self, dict1):
        self.__dict__.update(dict1)

# Load environment variables from nearest dotenv file
load_dotenv(find_dotenv())

seed = 2
forcePairType = -1
if __name__ == '__main__':
    # total arguments
    if len(sys.argv) > 1:
        seed = int(sys.argv[1])
    if len(sys.argv) > 2:
        forcePairType = int(sys.argv[2])

rng = np.random.default_rng(seed)

# Initialize model

# Load chats from 2023 Making Pairs That Cooperate study
chatLogs = loadChatLogs(os.getenv('DATA_ARCHIVE_PATH'))

if (len(chatLogs) == 0):
    print('No chat logs could be loaded')
    exit(0)

# Sample one conversation
sample = list(chatLogs.keys())[rng.integers(len(chatLogs))]

# with open(f"{os.getenv('EXPERIMENT_DIR')}/{os.getenv('EXPERIMENT_NAME')}/texts.json") as f:
#     texts = json.load(f)

topic = chatLogs[sample]['topic']
sampleMsgs = chatLogs[sample]['chatMsgs']

# system_msg = generateSystemMsg(chatLogs[sample]['pairType']) # If relational
# system_msg = generateSystemMsg(2, topic) # If personalized

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


    t = Thread(target=generate, args=[{'args': enc, 'kwargs': generate_kwargs}])
    t.start()
    for new_token in streamer:
        yield new_token
        if '</s>' == new_token:  # Breaking the loop if the stop token is generated.
            print('---[EOS TOKEN]---', flush=True)
            break
    t.join()

pairType = forcePairType if forcePairType > -1 else chatLogs[sample]['pairType']
pairTypeStr = '(Personalized) ' if forcePairType == 2 else ''
if chatLogs[sample]['pairType'] == 0:
    pairTypeStr += 'In Group'
elif chatLogs[sample]['pairType'] == 1:
    pairTypeStr += 'Out Group'

print(f'Pair Type: {pairTypeStr}')
print("Moderator:\n"+sampleMsgs[0].txt+"\n")
print("Moderator:\n"+sampleMsgs[1].txt+"\n")

# sampleMsgs = sampleMsgs[2:] # Remove the two initial chatbot messages

pairType = chatLogs[sample]['pairType']
topic = chatLogs[sample]['topic']
topicAgree = chatLogs[sample]['topicAgree']

# prompt = generatePrompt(pairType, topic, topicAgree, TREATMENT_MODE)
# system_msg = generateSystemMsg(pairType, topic, topicAgree)
# initial_prompt = generateInitialPrompt(sampleMsgs, TREATMENT_MODE)
# example_reply = generateExampleReply()

# sampleMsgs = sampleMsgs[2:] # Remove the two initial chatbot messages

# seed_messages = [
    # {'role': 'user', 'content': prompt}#,
    # {'role': 'assistant', 'content': example_reply},
# ]

# history = seed_messages
idx = 0

# Start the conversation
# history.append({
#                 "role": "user",
#                 "content": "Start the conversation with a greeting."
#             })
    
# reply = ''
# print('Assistant:')
# for partial_reply in predict(history):
#     print(partial_reply, end='')
#     sys.stdout.flush()
#     reply += partial_reply
# history.append({
#         'role': 'assistant',
#         'content': reply
#     })
# print('\n')

# Reply to messages

previousMsgs = ''
playerIds = [-1]
you = 0
lastMsgNoCaps = False

for msg in sampleMsgs:
    if (msg.playerId != -1):
        if you == 0 and msg.playerId not in playerIds:
            you = msg.playerId
    
    # if TREATMENT_MODE == 'partial':
    #     nextSentenceCtx = ''
    #     if idx+1 < len(sampleMsgs):
    #         nextSentenceCtx = ' '.join(sampleMsgs[idx+1].txt.split(' ')[0:CONTEXT_LEN])
    #     print(f'Completing: "{nextSentenceCtx}"')

    # # ------------------------------------------
    # # Full message generation history
    # if TREATMENT_MODE == 'full':
    #     history.append({
    #             "role": "user",
    #             "content": msg.content
    #         })
    # # ------------------------------------------
    # # Partial message generation history (autocompletion)
    # elif TREATMENT_MODE == 'partial':
    #     history.append({
    #             "role": "user",
    #             "content": f"Context: \"{msg.txt}\". Reply to the previous messages by completing the sentence: \"{nextSentenceCtx}\""
    #         })
    
    isPartner = False
    if (msg.playerId == you):
        previousMsgs += "YOU: "
        print ("YOU: ")
        if (not re.search(r'[A-Z]', msg.txt)):
            lastMsgNoCaps = True
        else:
            lastMsgNoCaps = False
    elif (msg.playerId != -1):
        previousMsgs += "PARTNER: "
        print ("PARTNER: ")
        isPartner = True
    else:
        previousMsgs += "MODERATOR: "
        print ("MODERATOR: ")
    previousMsgs += msg.txt + '\n\n'
    print(msg.txt + '\n\n')


    if isPartner:

        # We are going to generate a message
        # Formatting:
        # Prevent nonsense words by removing: strings with no spaces > 20 chars, words with numbers embedded
        # Prevent leaking information by removing anything placed between () [] {}

        

        prompt = generatePrompt(previousMsgs, pairType, topic, topicAgree, TREATMENT_MODE)
        history = [{
            "role": "user",
            "content": prompt
        }]
        
        print ("YOU (AI): ")
        
        has_space = False
        reply = ''
        
        buffered_msg = ''
        word = ''
        wait_for_closure = False
        
        # IS THE PREDICT FUNCTION BROKEN?
        # YES???
        # enc = tokenizer(prompt, return_tensors='pt', add_special_tokens=False)
        # enc['input_ids'] = enc['input_ids'].to(device)
        # enc['attention_mask'] = enc['attention_mask'].to(device)


        # t = Thread(target=generate, args=[{'args': enc, 'kwargs': generate_kwargs}])
        # t.start()
        # for new_token in streamer:
        #     print(new_token, end='', flush=True)
        #     if '</s>' == new_token:  # Breaking the loop if the stop token is generated.
        #         print('---[EOS TOKEN]---', flush=True)
        #         break
        # t.join()
        # END TEST

        # for partial_reply in predict(prompt):
        #     print(partial_reply, end='', flush=True)


        for partial_reply in predict(prompt):
            if lastMsgNoCaps:
                partial_reply = partial_reply.lower()
            
            word += partial_reply
            if (partial_reply.find(' ') >= 0):
                
                if len(word) > 20:
                    # LLM Error condition: Generated nonsense word
                    break
                elif word.lower().find('partner:') != -1 or word.lower().find('you:') != -1:
                    break
                
                if (wait_for_closure and (partial_reply.find(')') >= 0 or partial_reply.find('>') >= 0 or partial_reply.find(']') >= 0)):
                    wait_for_closure = False
                elif partial_reply.find('(') >= 0 or partial_reply.find('<') >= 0 or partial_reply.find('[') >= 0:
                    wait_for_closure = True
                elif (not re.search(r'[0-9]+[A-Za-z]|[A-Za-z]+[0-9]', word) and word.isascii()):
                    print(word, end='', flush=True)
                else:
                    break

                word = ''
                sys.stdout.flush()
            elif re.search(r'[^A-Z]\w+\.|\?|\!', partial_reply):
                # Last word
                print(word, end='', flush=True)
                word = ''
        print ("\n", flush=True)
        idx += 1

# End the conversation
# history.append({
#                 "role": "user",
#                 "content": "End the conversation with a goodbye message."
#             })
    
# reply = ''
# print('Assistant:')
# for partial_reply in predict(history):
#     print(partial_reply, end='')
#     sys.stdout.flush()
#     reply += partial_reply
# history.append({
#         'role': 'assistant',
#         'content': reply
#     })
# print('\n')
    
print('DONE!')