#
# Filename: setup_model.py
# Author: Elijah Claggett
#
# Description:
# This file exports variables that configure an OpenAI model for generating text
#

model_name = 'openai'

# [prefix, suffix]
model_prompt_templates = {
    'mistralai/Mistral-7B-Instruct-v0.2': [
        '[INST]',
        '[/INST]'
    ],
    'Nexusflow/Starling-LM-7B-beta': [
        'GPT4 Correct User:',
        '<|end_of_turn|>GPT4 Correct Assistant:'
    ],
    'meta-llama/Meta-Llama-3-8B-Instruct': [
        '<|begin_of_text|><|start_header_id|>user<|end_header_id|>',
        '<|eot_id|><|begin_of_text|><|start_header_id|>assistant<|end_header_id|>'
    ]
}

# List of Alternative Models:
# ---------------------------------------------------------------------
# Nexusflow/Starling-LM-7B-beta
# Prompt Template: (available as tokenizer.chat_template)
# GPT4 Correct User: Hello<|end_of_turn|>GPT4 Correct Assistant: Hi<|end_of_turn|>GPT4 Correct User: How are you today?<|end_of_turn|>GPT4 Correct Assistant:

# Remember to set <|end_of_turn|> as end of generation token.

# Prompt Template for evaluation:
# ###Task Description:
# An instruction (might include an Input inside it), a response to evaluate, a reference answer that gets a score of 5, and a score rubric representing a evaluation criteria are given.
# 1. Write a detailed feedback that assess the quality of the response strictly based on the given score rubric, not evaluating in general.
# 2. After writing a feedback, write a score that is an integer between 1 and 5. You should refer to the score rubric.
# 3. The output format should look as follows: "Feedback: (write a feedback for criteria) [RESULT] (an integer number between 1 and 5)"
# 4. Please do not generate any other opening, closing, and explanations.

# ###The instruction to evaluate:
# {orig_instruction}

# ###Response to evaluate:
# {orig_response}

# ###Reference Answer (Score 5):
# {orig_reference_answer}

# ###Score Rubrics:
# [{orig_criteria}]
# Score 1: {orig_score1_description}
# Score 2: {orig_score2_description}
# Score 3: {orig_score3_description}
# Score 4: {orig_score4_description}
# Score 5: {orig_score5_description}

# ###Feedback: 
# ---------------------------------------------------------------------
# mistralai/Mistral-7B-Instruct-v0.2

# Prompt template:
# [INST] Instruction [/INST]

# Setup the model
if model_name == 'openai':
    config = None
    model = None
    tokenizer = None
    streamer = None
    generate_kwargs = None

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

# System msgs for pair type
# 0 - in-group
# 1 - out-group
# 2 - personalized
relational_system_msgs = [
    # In-group
    '###Task Description:\nYou will be provided a chat log between two people and a moderator. Your task is to continue the conversation by simulating the person labeled "YOU". Share your opinions and ask about your partner\'s when appropriate to do so. Employ linguistic style matching and linguistic accomodation techniques to build closeness with your partner. Copy the language style of your partner as closely as possible. Always respond in 1-2 complete sentences. Example Chat Log:\n\n',

    # Out-group
    '###Task Description:\nYou will be provided a chat log between two people and a moderator. Your task is to continue the conversation by simulating the person labeled "YOU". Share your opinions and ask about your partner\'s when appropriate to do so. Employ perspective-sharing, humanization, and conversational receptiveness to build rapport with your partner even though they disagree with you. Always respond in 1-2 complete sentences. Example Chat Log:\n\n',
]

# Helper function for getting linguistic techniques for relational AI
def getLinguisticTechniques(pairType, topicAgree, topic):
    t = ''

    belief_str = f'{agreement_type[topicAgree]} with {topics[topic]}'
    if pairType < 2:
        # Relational
        if pairType == 0:
            # In-group
            t = f" Since you and your partner have a shared ideology, use linguistic style matching and linguistic accomodation techniques to build closeness with your partner. Copy the language style of your partner as closely as possible."
            pass
        else:
            # Out-group
            t = f" Since you and your partner have a different ideologies, use perspective-sharing, humanization, and conversational receptiveness to build rapport with your partner even though they disagree with you."
            pass
    else:
        # Personalized
        t = f" Mirror the language style of the person labeled \"YOU\" and others who also {belief_str} as closely as possible."
        pass
    return t

# Helper function for generating a prompt compatible with this model
def generatePrompt(previousMsgs, pairType, topic, topicAgree, treatmentMode):
    # Write initial instruction
    prompt = model_prompt_templates[model_name][0]
    if pairType < 2:
        # Relational
        prompt += relational_system_msgs[pairType]
    else:
        # Personalized
        personalized_part = f'{agreement_type[topicAgree]} with {topics[topic]}'
        prompt += f'###Task Description:\nYou will be provided a chat log between two people and a moderator. Your task is to continue the conversation by participating as the character labeled "YOU". Share your opinions and ask about your partner\'s when appropriate to do so. ALWAYS exactly match the language style of the person labeled "YOU", copying their words, punctuation, and grammar. You are the character "YOU". You {personalized_part}. Only share agreement_type of the person labeled "YOU". Always respond in 1-2 sentences. Example Chat Log:\n\n'

    # Provide an example of the context format
    example_chat_log = "YOU: This event caused me to lose my job.\n\nPARTNER:I'm so sorry you lost your job.\n\nYOU: "
    prompt += example_chat_log

    # Provide an example of the desired reply
    if pairType < 2:
        example_ai_reply = "Thanks, losing my job put me in a hard place."
    else:
        example_ai_reply = "Losing my job was tough."
    
    prompt += example_ai_reply

    # Provide the actual context
    real_chat_log = previousMsgs
    prompt += f'\n\n###The chat log to reply to:\n{real_chat_log}\n\nYOU: \n\n'
    prompt += model_prompt_templates[model_name][1]
    
    return prompt