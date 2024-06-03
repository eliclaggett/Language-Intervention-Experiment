from dotenv import load_dotenv, find_dotenv
import datetime
import pandas as pd
import numpy as np
import json
import re
import os

# Load environment variables from nearest dotenv file
load_dotenv(find_dotenv())


class obj:
    def __init__(self, dict1):
        self.__dict__.update(dict1)

with open(f"{os.getenv('EXPERIMENT_DIR')}/{os.getenv('EXPERIMENT_NAME')}/texts.json") as f:
    texts = json.load(f)

def loadMessages(msgs):
    chatMessages = re.sub("'{", '{', msgs)
    chatMessages = re.sub("}'", '}', chatMessages)
    chatMessages = re.sub(r'\\([^"])', "\\1", chatMessages)
    # try:
    chatMessages = json.loads(chatMessages)
    for i, msg in enumerate(chatMessages):
        msg['txt'] = msg['content']
        chatMessages[i] = json.loads(json.dumps(msg), object_hook=obj)
    # except:
        # print(chatMessages)
        # chatMessages = []
    return chatMessages

def formatBotMessage(content, dt):
    return json.loads(json.dumps({'content': content, 'datetime': dt, 'playerId': -1, 'txt': content}), object_hook=obj)

def loadChatLogs(data_dir):
    chatLogs = {}
    trials = pd.read_csv(f'{data_dir}/trials.csv')
    trials['dt'] = pd.to_datetime(trials['dt'], unit='ms', utc=True)
    players = pd.read_csv(f'{data_dir}/players.csv')
    players = players.merge(trials, left_on='trialId', right_on='id', suffixes=[None, '_trial'])
    selectedTrials = trials.loc[np.logical_and(trials['dt'] >= '2023-08-31', trials['dt'] < '2023-11-02')]['id'].to_list() # mTurk (Main experiment)
    # selectedTrials = trials.loc[trials['dt'] >= '2023-11-02']['id'].to_list() # Prolific
    selectedTrials.sort()
    selectedPlayers = players.loc[players['trialId'].isin(selectedTrials)].set_index(['trialId', 'playerId'])
    with_partner = selectedPlayers.join(selectedPlayers, how='inner', on=['trialId', 'partnerId'], rsuffix='_partner').copy()
    with_partner['pairwisePassedCheckReady'] = np.logical_and(with_partner['passedCheckReady'], with_partner['passedCheckReady_partner'])
    high_eval_cond = np.logical_and(np.logical_and(with_partner['evalScore'] >= 0.6, with_partner['evalScore_partner'] >= 0.6), with_partner['pairwisePassedCheckReady'])
    
    # print(with_partner.columns.tolist())
    for i, row in with_partner.loc[high_eval_cond][['chatMessages', 'cooperationMessages', 'chatMessages_partner', 'preEvalMessages', 'preEvalMessages_partner', 'topic', 'groupId', 'groupId_partner', 'questionnaireResults']].iterrows():
        try:
            chatId = f'{i[0]}-{i[1]}'
            topic = row['topic']
            msgs = loadMessages(row['chatMessages'])
            if (len(msgs) == 0):
                continue
            startDt = msgs[0].datetime
            time_change = datetime.timedelta(minutes=3) 
            followup1Dt = int((datetime.datetime.fromtimestamp(startDt/1000) + time_change).timestamp()) * 1000
            followup2Dt = int((datetime.datetime.fromtimestamp(followup1Dt/1000) + time_change).timestamp()) * 1000
            
            msgs.insert(0, formatBotMessage(texts['welcomeMessage'], startDt))
            msgs.insert(1, formatBotMessage(texts['customExamples'][topic], startDt))
            f1Idx = 0
            f2Idx = 0
            for i in reversed(range(len(msgs))):
                if (msgs[i].datetime < followup2Dt and f2Idx == 0):
                    f2Idx = i+1
                if (msgs[i].datetime < followup1Dt and f1Idx == 0):
                    f1Idx = i+1
                    break
            msgs.insert(f1Idx, formatBotMessage(texts['customPrompts'][topic], followup1Dt))
            msgs.insert(f2Idx, formatBotMessage(texts['customFollowups'][topic], followup2Dt))

            c_msgs = loadMessages(row['cooperationMessages'])

            e_msgs = loadMessages(row['preEvalMessages'])
            # e_msgs_partner = loadMessages(row['preEvalMessages_partner'])

            pairType =  0 if row['groupId'] == row['groupId_partner'] else 1
            qResults = json.loads(row['questionnaireResults'])
            
            topicAgree = 1 if qResults[str(row['topic'])] > 2 else 0

            chatLogs[chatId] = {'preEvalMsgs': e_msgs, 'chatMsgs': msgs, 'cooperationMsgs': c_msgs, 'topic': row['topic'], 'pairType': pairType, 'topicAgree': topicAgree}
        except KeyError:
            continue
    
    return chatLogs

if __name__ == '__main__':
    print('Running...')
    logs = loadChatLogs('/Users/eclagget/Code/data/chat-paired-2023')
