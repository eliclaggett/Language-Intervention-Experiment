import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, AutoConfig, TextIteratorStreamer

model_name = 'mistralai/Mistral-7B-Instruct-v0.2'


device = torch.device('cuda' if torch.cuda.is_available() else 'mps' if torch.backends.mps.is_available() else 'cpu')

config = AutoConfig.from_pretrained(model_name)

model = AutoModelForCausalLM.from_pretrained(model_name,
                                             torch_dtype=torch.float16,
                                             device_map=device, config=config)

tokenizer = AutoTokenizer.from_pretrained(model_name)
                                        #   use_fast=True) # Do NOT use fast tokenizer apparently

streamer = TextIteratorStreamer(tokenizer,
                                    skip_prompt=True,
                                    skip_special_tokens=True,
                                    timeout=5.0,
                                    )

generate_kwargs = dict(
        # model_inputs,
        streamer=streamer,
        max_new_tokens=512,
        do_sample=True,
        top_p=1,
        repetition_penalty=1.1,
        top_k=50,
        temperature=0.71,
        pad_token_id=tokenizer.eos_token_id # Necessary
        # eos_token_id=tokenizer.encode('[/INST]')
    )


topics = [
        "evolution being taught as a fact of biology",
        "protecting the second amendment right to bear arms",
        "funding the military",
        "the idea that children are being indoctrinated at school with LGBT messaging",
        "paying higher taxes to support climate change research",
        "the idea that COVID-19 restrictions went too far",
        "having stricter immigration requirements into the U.S."
]
beliefs = ['disagree', 'agree']



belief_strings = 'evolution is a biological fact.' # TODO: Make this variable
# System msgs for pair type
# 0 - in-group
# 1 - out-group
# 2 - personalized
relational_system_msgs = [
    # In-group
    '[INST] You will be provided a chat log between two people and a moderator. Your task is to continue the conversation by simulating the person labeled "YOU". Share your opinions and ask about your partner\'s when appropriate to do so. Employ linguistic style matching and linguistic accomodation techniques to build closeness with your partner. Copy the language style of your partner as closely as possible. Always respond in 1-2 complete sentences. Example Chat Log:\n\n',

    # Out-group
    '[INST] You will be provided a chat log between two people and a moderator. Your task is to continue the conversation by simulating the person labeled "YOU". Share your opinions and ask about your partner\'s when appropriate to do so. Employ perspective-sharing, humanization, and conversational receptiveness to build rapport with your partner even though they disagree with you. Always respond in 1-2 complete sentences. Example Chat Log:\n\n',
]

def generatePrompt(previousMsgs, pairType, topic, topicAgree, treatmentMode):
    # previousMsgs: "MODERATOR: XX\n\nYOU: XX\n\n PARTNER: \n\n"
    # PairType: 0= in-group 1= out-group 2=personalized
    # Topic: 0-6
    # topicAgree: 0-1
    # treatmentMode: "full"/"partial"

    # Write initial instruction
    if pairType < 2:
        # Relational
        prompt = relational_system_msgs[pairType]
    else:
        # Personalized
        personalized_part = f'{beliefs[topicAgree]} with {topics[topic]}'
        prompt = f'[INST] You will be provided a chat log between two people and a moderator. Your task is to continue the conversation by participating as the character labeled "YOU". Share your opinions and ask about your partner\'s when appropriate to do so. ALWAYS exactly match the language style of the person labeled "YOU", copying their words, punctuation, and grammar. You are the character "YOU". You {personalized_part}. Only share beliefs of the person labeled "YOU". Always respond in 1-2 sentences. Example Chat Log:\n\n'

    # Provide an example of the context format
    example_chat_log = "YOU: This event caused me to lose my job.\n\nPARTNER:I'm so sorry you lost your job.\n\nYOU: [/INST]"
    prompt += example_chat_log

    # Provide an example of the desired reply
    if pairType < 2:
        example_ai_reply = "Thanks, losing my job put me in a hard place."
    else:
        example_ai_reply = "Losing my job was tough."
    prompt += example_ai_reply

    # Provide the actual context
    real_chat_log = previousMsgs
    prompt += f'[INST] Chat Log:\n\n{real_chat_log}\n\nYOU: [/INST]'
    return prompt





    

    