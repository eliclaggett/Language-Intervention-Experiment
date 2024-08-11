import { Batch, ClassicListenersCollector, Game, Player } from "@empirica/core/admin/classic";
import * as fs from 'fs';
import axios from 'axios';
import dotenv from 'dotenv';
import findConfig from "find-config";
export const Empirica = new ClassicListenersCollector();
import { makePairs } from "./pairing";

let dotEnvPath = null;
if (fs.existsSync('/home/ubuntu/eli')) {
  dotEnvPath = findConfig('.env', {cwd: '/home/ubuntu/eli/experiment'});
} else if (fs.existsSync('/Users/eclagget/Code/experiment')) {
  dotEnvPath = findConfig('.env', {cwd: '/Users/eclagget/Code/experiment/chat-cooperation'});
}

if (dotEnvPath) {
  console.log('Loading dotenv file!');
  const envFile = dotenv.parse(fs.readFileSync(dotEnvPath));
  for (const key of Object.keys(envFile)) {
    process.env[key] = envFile[key];
  }
} else {
  console.log('Warning: No dotenv file!');
}

const completionCodes = {
  task1: 'C1CUDUAH',
  task2: 'C1JF7BDA',
  // defection: 'defect',
  // cooperation: 'cooperate',
  // mutualCooperation: 'mutual_cooperate'
};

const gameParams = {
  version: 'June 2024',
  
  // Payouts
  task1Pay: 3,
  task2Pay: 3,
  bonus: 3,
  maxBonusShare: 2, // Used in consent form, tutorial, and economic game to calculate bonus range
  shareMultiplier: 1.5,
  
  // Experiment parameters
  treatmentType: 'suggestion', // suggestion, none (previously completion, suggestion, rewrite, none)
  treatmentAlgorithm: 'personal', // relational, personal
  suggestionProbability: 1,

  // Configuration
  numMsgsFinishEarly: 30,

  // Timing
  chatTime: 10,
  followupDelay1: 3,
  followupDelay2: 3,
  cooperationDiscussionTime: 3,
  cooperationTime: 3,
  reflectionSurveyTime: 7,
  partnerAnswerTime: 2,

  // Misc. global variables
  samplingType: 'within' // within, between (passed pre-eval or not)
};

const botTexts = JSON.parse(fs.readFileSync(process.env['EXPERIMENT_DIR'] + '/' + process.env['EXPERIMENT_NAME'] + '/texts.json'))
botTexts['preEvalMessages'] = botTexts['messagesEvaluation'][2]

const submittedOpinionSurvey = new Set();
const preEvalTimers = {};
const playerStatus = {};
const chatChannelTopics = {};
let gamePairs = {};
let currentGame = null;

Empirica.on("game", (ctx, { game }) => {
  // game init after at least one player joins the lobby
  console.log('main task init');
  game.set('gameParams', gameParams);
  game.set('lobbyDuration', game.lobbyConfig.duration);
  game.set('submitCooperationDecision', false);
  game.set('currentStage', 'onboarding');
  currentGame = game;
});

function startChatbotPrompting(game) {
  let currentMinute = 0;
  game.set('currentStage', 'mainDiscussion');
  for (const k of Object.keys(chatChannelTopics)) {
    const topic = parseInt(chatChannelTopics[k].substring(1)) - 1;

    const msgs = [];
    msgs.push({
      sender: -1,
      sentTime: 'just now',
      txt: botTexts['welcomeMessage']
    });

    msgs.push({
      sender: -1,
      sentTime: 'just now',
      txt: botTexts['customExamples'][topic]
    });

    game.set(k, msgs);
  }

  const promptInterval = setInterval(() => {
    let nextPrompt = '';

    for (const k of Object.keys(chatChannelTopics)) {
      const topic = parseInt(chatChannelTopics[k].substring(1)) - 1;
      const p1Id = k.split('-')[1];
      const p2Id = k.split('-')[2];

      const p1 = game.players.filter((p) => p.id == p1Id)[0];
      const p2 = game.players.filter((p) => p.id == p2Id)[0];

      if (currentMinute == gameParams['followupDelay1']) {
        nextPrompt = botTexts['customPrompts'][topic];
      } else if (currentMinute == gameParams['followupDelay1']+gameParams['followupDelay2']) {
        nextPrompt = botTexts['customFollowups'][topic];
      }
      else if (currentMinute == gameParams.chatTime-1 && gameParams.cooperationDiscussionTime > 0 && !(p1.get('requestEarlyFinish') || p2.get('requestEarlyFinish')) ) {
      
        const cooperationDiscussionPrompts = ['Time\'s up! Thank you for discussing your opinions.',
        'Finally, you have a few minutes to discuss how to allocate your bonus.',
        'If you share your bonus with each other, you will both receive 2x the amount you share.',
        "You may also choose to keep your bonus to yourselves or pay to decrease your partner's bonus."];
        const cooperationDiscussionMsgs = cooperationDiscussionPrompts.map((el) => { return {
          sender: -1,
          sentTime: 'just now',
          txt: el
        }});
        const msgs = game.get(k) || [];
        game.set(k, [...msgs, ...cooperationDiscussionMsgs]);
        game.set('currentStage', 'cooperationDiscussion');
      }

      if (nextPrompt.length > 0) {
        const msgs = game.get(k) || [];

        game.set(k, [...msgs, {
          sender: -1,
          sentTime: 'just now',
          txt: nextPrompt
        }]);
      }
    }

    Empirica.flush();
    currentMinute++;

    if (currentMinute > gameParams.chatTime) {
      clearInterval(promptInterval);
    }
  }, 60 * 1000); // Once per minute
}

let ps = {};
const playerChatChannels = {};
const playerTypingChannels = {};

Empirica.onGameStart(({ game }) => {
  console.log('making pairs');
  // Setup the main task
  // Must add a round to be able to use stages?
  const round = game.addRound({
    name: "Round",
  });

  // round.addStage({ name: "conversation", duration:
  //   (gameParams.chatTime + gameParams.cooperationDiscussionTime) * 60 
  // });
  // round.addStage({ name: "cooperation", duration: gameParams.cooperationTime * 60 });
  round.addStage({
    name: "semi_asynchronous_steps", duration:
      (
      gameParams.chatTime +
      gameParams.cooperationDiscussionTime +
      gameParams.cooperationTime +
      gameParams.reflectionSurveyTime +
      gameParams.partnerAnswerTime
      ) * 60
  });

  // Pair all participants
  const players = game.players.filter((p) => submittedOpinionSurvey.has(p.id));
  ps = players;
  const playerIds = [];
  // const playerOpinionSurveyResponses = {};
  // const pairs = [];


  const [pairs, topics, groups] = makePairs(players, gameParams['samplingType']);

  gamePairs = pairs;
  gameGroups = groups;

  for (const player of game.players) {

    if (typeof(pairs[player.id]) == 'undefined' || pairs[player.id] == -1) {
      // Could not pair player
      console.log('could not pair player', player.get('participantIdentifier'));
      player.set('end', true);
      player.set('endReason', 'noPair');
      // player.exit('noPair');
      continue;
    }

    const partner = players.filter((p) => p.id == pairs[player.id])[0];

    let chatChannel = 'c-' + player.id + '-' + partner.id;
    let typingChannel = 't-' + player.id + '-' + partner.id;
    if (Object.keys(playerChatChannels).includes(partner.id)) {
      chatChannel =  playerChatChannels[partner.id];
      typingChannel =  playerTypingChannels[partner.id];
    }
    
    playerChatChannels[player.id] = chatChannel;
    playerTypingChannels[player.id] = typingChannel;

    player.set('chatChannel', chatChannel);
    player.set('typingChannel', typingChannel);
    player.set('partnerId', partner.id);
    player.set('topic', topics[player.id]);
    player.set('completionCode', completionCodes['task2']);
    player.set('group', groups[player.id]);
    player.set('partnerGroup', groups[partner.id]);
    player.set('msgCount', 2);

    partner.set('chatChannel', chatChannel);
    chatChannelTopics[chatChannel] = topics[player.id];
    partner.set('typingChannel', typingChannel);
    partner.set('partnerId', player.id);
    partner.set('topic', topics[partner.id]);
    partner.set('completionCode', completionCodes['task2']);
    partner.set('group', groups[partner.id]);
    partner.set('partnerGroup', groups[player.id]);

    player.set('startTask2', true);
    player.set('msgUnderReview', '');
  }

  startChatbotPrompting(game);
});

Empirica.onRoundStart(({ round }) => { 
  console.log('round started');
});

Empirica.onStageStart(({ stage }) => { 
  console.log('stage started');
});

Empirica.onStageEnded(({ stage }) => {
  console.log('stage ended');
  // console.log(stage);
  // for (const player of stage.currentGame.players) {
    // player.set('serverChatEnded', true);
    // console.log('Player:');
    // console.log(player.id);
  // }
});

Empirica.onRoundEnded(({ round }) => { });

Empirica.onGameEnded(({ game }) => { 
  
  console.log('game ended');
  
});

// Custom callbacks

// Called when a participant joins
Empirica.on("player", (ctx, { player, _ }) => {
  if (player.get('gameParams')) return;

  player.set('gameParams', gameParams);
  // player.set('isTyping', false);
  // player.set('partner', -1);
  // player.set('partnerFinished', false);
  // player.set('passEval', true);
  // player.set('preEvalStep', 0);
  // player.set('finishPreEval', false);
  // player.set('startTask2', false);
  // player.set('submitCooperationDecision', false);
  // player.set('cooperationDecision', false);
  // player.set('completionCode', completionCodes['task1']);
  // player.set('partnerCooperationDecision', -1);
  // player.set('partnerCooperationType', 'Share');
  // player.set('processGameEnd', false);
  // player.set('acceptSuggestion', []);
  // player.set('submittedSurvey' ,false);

  playerStatus[player.id] = {
    cooperationDecision: -1,
    cooperationType: 'Share',
    submitReflectionSurvey: false,
  };
});

// Called when a participant submits the reCAPTCHA
Empirica.on("player", "submitRecaptcha", (ctx, { player, submitRecaptcha }) => {
  const data = submitRecaptcha;

  if (data === true) { return; }

  if ('data' in data && data['data']) {
    const secret = process.env['DEPLOYMENT'] == 'dev' ?
      '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe' :
      process.env['RECAPTCHA_SECRET'];
    const response = data['data'];

    axios.post(`https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${response}`,
      {},
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=utf-8"
        },
      })
      .then((resp) => {
        const respData = resp.data;
        if (respData.success) {
          player.set('passedRecaptcha', true);
          Empirica.flush(); // Allows asynchronous state updates
        } else {
          player.set('passedRecaptcha', false);
        }
      });
  }
});

// Called when a participant submits the consent form
Empirica.on("player", "submitConsentForm", (ctx, { player, submitConsentForm }) => {
  const consentFormResponse = submitConsentForm;
  let passedConsentForm = true;
  for (q in consentFormResponse) {
    if (consentFormResponse[q] != 'yes') { passedConsentForm = false; }
  }
  player.set('passedConsentForm', passedConsentForm);
});


function updatePreEvalMessageSchedule(player) {
  if (preEvalTimers[player.id]) clearInterval(preEvalTimers[player.id]);

  setTimeout(() => {
    let preEvalStep = player.get('preEvalStep');
    let oldMsgs = player.get('preEvalMessages') || [];

    if (preEvalStep >= botTexts['preEvalMessages'].length) { 
      player.set('finishPreEval', true);
      Empirica.flush();
      return; 
    }

    player.set('preEvalMessages', [...oldMsgs, {
      sender: -1,
      sentTime: 'just now',
      txt: botTexts['preEvalMessages'][preEvalStep]
    }]);
    
    player.set('preEvalStep', preEvalStep+1);
    Empirica.flush();

    preEvalTimers[player.id] = setInterval(() => {
      oldMsgs = player.get('preEvalMessages') || [];
      preEvalStep = player.get('preEvalStep');
  
      if (preEvalStep >= botTexts['preEvalMessages'].length) {
        player.set('finishPreEval', true);
        Empirica.flush();
        clearInterval(preEvalTimers[player.id]);
        return;
      }
  
      player.set('preEvalMessages', [...oldMsgs, {
        sender: -1,
        sentTime: 'just now',
        txt: botTexts['preEvalMessages'][preEvalStep]
      }]);
      
      player.set('preEvalStep', preEvalStep+1);
      Empirica.flush();
    }, 1000 * 60);
  }, 1000 * 5); // 5 seconds for reply
}

Empirica.on("player", "startPreEval", (ctx, { player, startPreEval }) => {
  updatePreEvalMessageSchedule(player);
});

Empirica.on("player", "sendPreEvalMsg", (ctx, { player, sendPreEvalMsg }) => {
  updatePreEvalMessageSchedule(player);
});

Empirica.on("player", "submitOpinionSurvey", (ctx, { player, submitOpinionSurvey }) => {
  // console.log(submitOpinionSurvey);
  let hasSomeOpinion = false;
  for (const q in submitOpinionSurvey) {
    if (submitOpinionSurvey[q] != '3') {
      hasSomeOpinion = true; break;
    }
  }
  if (!hasSomeOpinion) {
    player.set('end', true);
    player.set('endReason', 'noOpinion');
    player.exit('noOpinion');
  } else {
    submittedOpinionSurvey.add(player.id);
  }
  
});

Empirica.on("player", "submitReflectionSurvey", (ctx, { player, submitReflectionSurvey }) => {
  const reflectionSurveyResponse = submitReflectionSurvey;
  if (playerStatus[player.id]) playerStatus[player.id].submitReflectionSurvey = true;
  // player.set('submittedSurvey', true);
  const partner = null;
});

Empirica.on("player", "requestEarlyFinish", (ctx, { player, requestEarlyFinish }) => {
  
  const chatChannel = player.get('chatChannel');
  const partnerId = gamePairs[player.id];
  const partner = player.currentGame.players.filter((p) => p.id == partnerId)[0];
  partner.set('forceEarlyFinish', true);
  
  const cooperationDiscussionPrompts = ['Time\'s up! Thank you for discussing your opinions.',
    'Finally, you have a few minutes to discuss how to allocate your bonus.',
    'If you share your bonus with each other, you will both receive 2x the amount you share.',
    "You may also choose to keep your bonus to yourselves or pay to decrease your partner's bonus."];
  const cooperationDiscussionMsgs = cooperationDiscussionPrompts.map((el) => { return {
    sender: -1,
    sentTime: 'just now',
    txt: el
  }});

  const msgs = player.currentGame.get(chatChannel) || [];
  
  player.currentGame.set(chatChannel, [...msgs, ...cooperationDiscussionMsgs]);
  player.currentGame.set('currentStage', 'cooperationDiscussion')
});

Empirica.on("game", "earlyFinishTime", (ctx, { game, earlyFinishTime }) => {
  
  const playerId = earlyFinishTime['playerId'];
  const finishTime = earlyFinishTime['finishTime'];

  const player = game.players.filter((p) => p.id == playerId)[0];
  const partnerId = gamePairs[player.id];
  const partner = game.players.filter((p) => p.id == partnerId)[0];
  
  player.set('earlyFinishTime', finishTime);
  partner.set('earlyFinishTime', finishTime);
});

Empirica.on("game", "partnerAnswer", (ctx, { game, partnerAnswer }) => {
  const partnerId = gamePairs[partnerAnswer.playerId];
  const partner = game.players.filter((player) => player.id == partnerId)[0];
  if (partner) {
    partner.set('partnerAnswer', partnerAnswer.partnerAnswer);
  }
});

Empirica.on("game", "submitCooperationDecision", (ctx, { game, submitCooperationDecision }) => {

  const val = submitCooperationDecision;

  if (!val['playerId']) { return; }

  const player = game.players.filter((player) => player.id == val['playerId'])[0];
  const partner = game.players.filter((player) => player.id == gamePairs[val.playerId])[0];


  partner.set('partnerCooperationDecision', val.cooperationDecision);
  partner.set('partnerCooperationType', val.cooperationType);


  playerStatus[val.playerId].cooperationDecision = val.cooperationDecision;
  playerStatus[val.playerId].cooperationType = val.cooperationType;

  if (playerStatus[partner.id].cooperationDecision > -1) {
    // if (val.cooperationDecision == 2) {
      // Mutual cooperation
    partner.set('completionCode', completionCodes['task2']);
    // }
    partner.set('partnerFinished', true);
    player.set('partnerFinished', true);
  }

  // if (playerStatus[val.partnerId].cooperationDecision == 2 && val.cooperationDecision == 2) {
    // Mutual cooperation
    player.set('completionCode', completionCodes['task2']);
  // } else if (val.cooperationDecision == 2) {
    // player.set('completionCode', completionCodes['cooperation']);
  // } else if (val.cooperationDecision == 1) {
    // player.set('completionCode', completionCodes['defection']);
  // }

});

// Called when each participant joins the lobby
Empirica.on("game", 'startLobby', (ctx, { game }) => {
  // Start a timer when the first person finishes onboarding
  console.log('starting lobby');
  if (typeof (game.get('lobbyTimeout')) == 'undefined') {
    const now = Date.now();
    if (game.lobbyConfig) {
      const expirationTS = now + game.lobbyConfig.duration / 1000000;
      game.set('lobbyTimeout', (new Date(expirationTS)).toISOString());
    }
  }
});


// Manually set cooperation decision if partner became unresponsive
Empirica.on('player', 'processGameEnd', (ctx, {player, processGameEnd}) => {

  const partnerCooperationDecision = player.get('partnerCooperationDecision') || -1;
  if (partnerCooperationDecision < 0) {
    // player.set('partnerCooperationDecision', 0);
  }

});

Empirica.on("game", 'reportPartner', (ctx, { game, reportPartner }) => {
  // Start a timer when the first person finishes onboarding
  console.log(reportPartner);
  const p = game.players.filter((p) => p.id == reportPartner.victim)[0];
  const partner = game.players.filter((p) => p.id == gamePairs[reportPartner.victim])[0];
  if (p) {
    p.set('end', true);
    p.set('endReason', 'reportPartner');
    p.exit('reportPartner');
  }
  if (partner) {
    partner.set('end', true);
    partner.set('endReason', 'reported');
    partner.exit('reported');
  }

});