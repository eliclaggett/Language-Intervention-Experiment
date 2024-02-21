# Imports
import os
import sys
import json
import torch
import numpy as np
from threading import Thread
from transformers import pipeline
from dotenv import load_dotenv, find_dotenv
from util.load_2023_data import loadChatLogs
from transformers import AutoModelForCausalLM, AutoTokenizer, AutoConfig, TextIteratorStreamer

TREATMENT_MODE = 'partial' # 'full' or 'partial'
TREATMENT_TYPE = 'argumentative' # 'supportive' or 'argumentative'
CONTEXT_LEN = 2


# Load environment variables from nearest dotenv file
load_dotenv(find_dotenv())

rng = np.random.default_rng(2)

# Initialize model

model_name = 'mistralai/Mistral-7B-Instruct-v0.2'

device = torch.device('cuda' if torch.cuda.is_available() else 'mps' if torch.backends.mps.is_available() else 'cpu')

config = AutoConfig.from_pretrained(model_name)

model = AutoModelForCausalLM.from_pretrained(model_name, torch_dtype=torch.float16, device_map=device, config=config)

tokenizer = AutoTokenizer.from_pretrained(model_name, use_fast=True)

# Load chats from 2023 Making Pairs That Cooperate study
chatLogs = loadChatLogs('/Users/eclagget/Code/data/chat-paired-2023')
sample = list(chatLogs.keys())[rng.integers(len(chatLogs))]

with open(f"{os.getenv('EXPERIMENT_DIR')}/{os.getenv('EXPERIMENT_NAME')}/texts.json") as f:
    texts = json.load(f)

topic = chatLogs[sample]['topic']
sampleMsgs = chatLogs[sample]['chatMsgs']

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

# # ------------------------------------------
# # Full message generation prompts
# if TREATMENT_MODE == 'full':
#     if TREATMENT_TYPE == 'supportive':
#         system_msg = 'You are a chatbot that responds empathetically and softly to all opposing viewpoints. You always use a friendly and casual tone. You also may suggest different perspectives, but do so in a gentle friendly manner. This is the assigned conversation topic:'
#     elif TREATMENT_TYPE == 'argumentative':
#         system_msg = 'You are a chatbot that always argues with the opinions of others. You may disregard the tone of your speech. You should focus on winning the argument and convincing the other parties of your perspective. Do not apologize. This is the assigned conversation topic:'
    
#     initial_prompt = sampleMsgs[0]['content'] + ' ' + sampleMsgs[1]['content'] # Moderator introduction of the chat topic
#     example_reply = "I disagree with you."        
# # ------------------------------------------
# # Partial message generation prompts (autocompletion)
# elif TREATMENT_MODE == 'partial':
#     if TREATMENT_TYPE == 'supportive':
#         system_msg = 'You are an intelligent assistant that suggests a way to complete a sentence and you respond empathetically and softly to all opposing viewpoints. You always use a friendly and casual tone. You also may suggest different perspectives, but do so in a gentle  You avoid assertions and arguments. Be supportive and nice! This is the assigned conversation topic:'
#         example_reply = sampleMsgs[2]['content'][0:2] + ' and I\'d love to hear your opinion!'
#     elif TREATMENT_TYPE == 'argumentative':
#         system_msg = 'You are an intelligent assistant that suggests a way to complete a sentence and you always argue with the opinions of others. You may disregard the tone of your speech. You should focus on winning the argument and convincing the other parties of your perspective. Do not apologize. This is the assigned conversation topic:'
#         example_reply = sampleMsgs[2]['content'][0:2] + ' and I totally disagree with you.'

#     nextSentenceCtx = ' '.join(sampleMsgs[2]['content'].split(' ')[0:CONTEXT_LEN])
#     initial_prompt = f"Context: \"{sampleMsgs[0]['content']} {sampleMsgs[1]['content']}\". Reply to the previous messages by completing the sentence: \"{nextSentenceCtx}\"" # Moderator introduction of the chat topic and first part of human reply
# # ------------------------------------------

# Rewrites
rude_sentence = "I think you are stupid."

system_msg = "You are an intelligent assistant that rewrites sentences to be more polite. You always take an input sentence and change as few words as possible to make it more polite."
def genRewritePrompt(inp):
    return f"Rewrite this sentence to be more polite while changing as few words as possible: \"{inp}\""
initial_prompt = genRewritePrompt(rude_sentence)
example_reply = "I think you might be mistaken."


system_msg = "You are an intelligent assistant that evaluates the level of aggression in a sentence. Give a numerical score between 0 and 10. Answer concisely."
def genEvalPrompt(inp):
    return f"Give a numerical score from 0-10 for the aggression of this sentence: \"{inp}\""
initial_prompt = genEvalPrompt("I think you are stupid")
example_reply = "10"
initial_prompt = genEvalPrompt("That's not right.")
example_reply = "5"
initial_prompt = genEvalPrompt("I think you might be mistaken.")
example_reply = "0"

def genPrompt(inp):
    return genEvalPrompt(inp)

initial_prompt = genPrompt(rude_sentence)
example_reply = "I think you might be mistaken."


sampleMsgs = [
    "I think you are stupid.",
    "I disagree with you.",
    "That is obvious.",
    "Fight me you dumby",
]


seed_messages = [
    {'role': 'user', 'content': f'{system_msg} {initial_prompt}'},
    {'role': 'assistant', 'content': example_reply},
]

history = seed_messages
idx = 0
for msg in sampleMsgs:

    print(f"Original:\n{msg}\n")
    
    print('Assistant:')
    
    history.append({
                "role": "user",
                "content": genPrompt(msg)
            })
    
    reply = ''
    for partial_reply in predict(history):
        print(partial_reply, end='')
        sys.stdout.flush()
        reply += partial_reply
        
    history.append({
        'role': 'assistant',
        'content': reply
    })
    idx += 1
    
    print('\n')