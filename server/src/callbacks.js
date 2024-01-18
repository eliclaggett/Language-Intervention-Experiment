import { Batch, ClassicListenersCollector, Game, Player } from "@empirica/core/admin/classic";
import * as fs from 'fs';
import axios from 'axios';
import dotenv from 'dotenv';
import findConfig from "find-config";
export const Empirica = new ClassicListenersCollector();
import { makePairs } from "./pairing";

let dotEnvPath = null;
if (fs.existsSync('/home/ubuntu/eli')) {
  dotEnvPath = findConfig('.env', {cwd: '/home/ubuntu/eli/empirica'});
} else {
  dotEnvPath = findConfig('.env', {cwd: '/Users/eclagget/Code/chat-cooperation'});
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
  version: 'November 2023',
  
  task1Pay: 3,
  task2Pay: 2,
  defectionBonus: 2,
  cooperationBonus: 4,
  maxBonus: 4,
  bonus: 2,
  
  samplingType: 'within',

  chatTime: 10,
  followupDelay1: 3,
  followupDelay2: 3,

  cooperationDiscussionTime: 3,
  cooperationTime: 3,
  reflectionSurveyTime: 7,
  partnerAnswerTime: 2,

  participantCounter: 0
};
const botTexts = {
  "customExamples": [
    "David Campbell, a teacher in Orange Park, FL admitted to teaching inaccurate simplifications about evolution as long as he could convince religious students that evolution is real. What do you think about this story?",
    "The parents of a Michigan gunman who killed four high school students in 2021 are now being tried for involuntary manslaughter because they purchased the weapon for their son. What do you think about this story?",
    "Lockheed Martin, which has spent the past 20 years developing a new F-35 fighter jet, is projected to receive over 1.7 trillion dollars for aircraft that continue to malfunction and face delays. Some believe it will never be ready to fly. What are your reactions to hearing this?",
    "People are outraged at the finding that public schools in New York City have spent over $200,000 doing drag queen story hours which have been suspected of “grooming” children. What are your reactions to recent stories like these?",
    "In response to the U.S. government continuing to increase restrictions on fossil fuel use, former Energy Secretary Rick Perry has released a statement saying that these skyrocketing energy prices are \"killing America.\" What do you think?",
    "Regarding the U.S'. response to the COVID-19 pandemic, Supreme Court Justice Neil Gorsuch said we \"experienced the greatest intrusions on civil liberties in the peacetime history of this country.\" Do you think COVID-19 restrictions went too far?",
    "Representative Elise Stefanik has stated that the U.S. is \"sacrificing America's children's safety and happiness to prioritize the needs of illegals\" referring to the influx of migrants into New York City. Do you share this opinion?"
  ],
  "customExampleSources": [
    "https://www.nytimes.com/2008/08/24/education/24evolution.html",
    "https://www.nbcnews.com/news/us-news/oxford-michigan-school-shooters-parents-will-stand-trial-rcna76357",
    "https://www.nytimes.com/2019/08/21/magazine/f35-joint-strike-fighter-program.html",
    "https://www.ny1.com/nyc/all-boroughs/education/2022/06/16/queens-councilmember-calls-drag-queen-story-hours-in-schools--grooming-",
    "https://www.foxnews.com/media/democrats-killing-america-rick-perry",
    "https://www.foxnews.com/politics/gorsuch-gives-scathing-overview-covid-era-fear-desire-safety-powerful-forces",
    "https://www.foxnews.com/politics/ny-house-republicans-blast-dems-states-migrant-crisis-packing-school-gyms-absolutely-unacceptable"
  ],
  "customPrompts": [
    "Now, exchange your opinions on the way evolution should be taught in schools. Would you want your kids learning it?",
    "Now, exchange your opinions on the degree that gun rights should be protected or abolished.",
    "Now, exchange your opinions on how much the military should be funded. How much of your tax dollars would you be willing to provide?",
    "Now, exchange your opinions on the inclusion of gay and transgender stories in public schools. How would you feel if your children had access to these?",
    "Now, exchange your feelings about the severity of global warming.",
    "Now, exchange your opinions on the way the COVID-19 pandemic was handled.",
    "Now, discuss how you feel immigration affects society."
  ],
  "customFollowups": [
    "Should teachers be punished for choosing to teach creationism as an alternative explanation?",
    "What do you think decreasing access to guns will do to society?",
    "Is there meaning to having the strongest military if it doesn't get involved in world conflicts?",
    "Should teachers and books in public schools be banned from discussing sexuality and gender?",
    "How much can economic prosperity be sacrificed to prevent climate change?",
    "Do you think the CDC is a trustworthy source of information?",
    "How would your opinions change if immigrants were given more social support services like food stamps and medicare?"
  ],
  'preEvalMessages': [
    "Hey, how's it going?",
    "I'm doing well myself. First of all, I think the fear around AI's capabilities is overblown.",
    "Instead of being fearful, I actually think it's cool that AI can help edit photos and text to make them look better to us. What do you think?",
    "Why do you feel that way?",
    "I see. People are so afraid that AI has all these problems like replacing human jobs and creating unrealistic beauty standards but I think that's always been happening. Nothing new.",
    "I do understand that the speed and scale of AI's effect on society is different than before. It's definitely messed up that you can't tell whether something is real or not.",
    "It's especially bad that ChatGPT straight up lies to people sometimes.",
    "Anyways, I'm hopeful we can figure out as a society how to fix AI's problems. It was nice chatting with you!"
  ]
};

const submittedOpinionSurvey = new Set();
const preEvalTimers = {};
const playerStatus = {};
const chatChannelTopics = {};
let gamePairs = {};

Empirica.on("game", (ctx, { game }) => {
  // game init after at least one player joins the lobby
  console.log('main task init');
  game.set('gameParams', gameParams);
  game.set('lobbyDuration', game.lobbyConfig.duration);
  game.set('submitCooperationDecision', false);

});

function startChatbotPrompting(game) {
  let currentMinute = 0;

  for (const k of Object.keys(chatChannelTopics)) {
    const topic = parseInt(chatChannelTopics[k].substring(1)) - 1;

    const msgs = [];
    msgs.push({
      sender: -1,
      sentTime: 'just now',
      txt: 'Welcome to the chat room! Please discuss your opinions about the following news story.'
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

      if (currentMinute == gameParams['followupDelay1']) {
        nextPrompt = botTexts['customPrompts'][topic];
      } else if (currentMinute == gameParams['followupDelay1']+gameParams['followupDelay2']) {
        nextPrompt = botTexts['customFollowups'][topic];
      }
      else if (currentMinute == gameParams.chatTime-1) {
      
        const cooperationDiscussionPrompts = ['Times up! Thank you for discussing your opinions.',
        'Now, you have a few minutes to discuss how to allocate your bonus.',
        'If you share your bonus with each other, you will both receive 2x the amount you share.',
        "You may also choose to keep your bonus to yourselves or pay to decrease your partner's bonus."];
        const cooperationDiscussionMsgs = cooperationDiscussionPrompts.map((el) => { return {
          sender: -1,
          sentTime: 'just now',
          txt: el
        }});
        const msgs = game.get(k) || [];
        game.set(k, [...msgs, ...cooperationDiscussionMsgs]);
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
Empirica.onGameStart(({ game }) => {
  console.log('making pairs');
  // Setup the main task
  // Must add a round to be able to use stages?
  const round = game.addRound({
    name: "Round",
  });

  round.addStage({ name: "conversation", duration:
    (gameParams.chatTime + gameParams.cooperationDiscussionTime) * 60 
  });
  // round.addStage({ name: "cooperation", duration: gameParams.cooperationTime * 60 });
  round.addStage({
    name: "semi_asynchronous_steps", duration:
      (
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

    if (typeof (pairs[player.id]) == 'undefined' || pairs[player.id] == -1) {
      // Could not pair player
      console.log('could not pair player',player.id);
      player.set('end', true);
      player.set('endReason', 'noPair');
      player.exit('noPair');
      continue;
    }

    const partner = players.filter((p) => p.id == pairs[player.id])[0];

    chatChannel = 'c-' + player.id + '-' + partner.id;
    typingChannel = 't-' + player.id + '-' + partner.id;

    player.set('chatChannel', chatChannel);
    player.set('typingChannel', typingChannel);
    player.set('partnerId', partner.id);
    player.set('topic', topics[player.id]);
    player.set('completionCode', completionCodes['task2']);
    player.set('group', groups[player.id]);
    player.set('partnerGroup', groups[partner.id]);

    partner.set('chatChannel', chatChannel);
    chatChannelTopics[chatChannel] = topics[player.id];
    partner.set('typingChannel', typingChannel);
    partner.set('partnerId', player.id);
    partner.set('topic', topics[partner.id]);
    partner.set('completionCode', completionCodes['task2']);
    partner.set('partnerAnswer', 'N/A');
    partner.set('group', groups[partner.id]);
    partner.set('partnerGroup', groups[player.id]);

    player.set('startTask2', true);
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
  player.set('isTyping', false);
  player.set('id', gameParams.participantCounter++);
  player.set('partner', -1);
  player.set('partnerFinished', false);
  player.set('passEval', true);
  player.set('preEvalStep', 0);
  player.set('finishPreEval', false);
  player.set('startTask2', false);
  player.set('submitCooperationDecision', false);
  player.set('cooperationDecision', false);
  player.set('completionCode', completionCodes['task1']);
  player.set('partnerCooperationDecision', -1);
  player.set('partnerCooperationType', 'Share');
  player.set('processGameEnd', false);
  player.set('acceptSuggestion', []);
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

Empirica.on("player", "submitOpinionSurvey", (ctx, { player, sendPreEvalMsg }) => {
  submittedOpinionSurvey.add(player.id);
});


Empirica.on("player", "submitReflectionSurvey", (ctx, { player, submitReflectionSurvey }) => {
  const reflectionSurveyResponse = submitReflectionSurvey;
  if (playerStatus[player.id]) playerStatus[player.id].submitReflectionSurvey = true;
  // player.set('submittedSurvey', true);
  const partner = null;
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