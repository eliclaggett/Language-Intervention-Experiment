/*
 * Filename: callbacks.js
 * Author: Elijah Claggett
 *
 * Description:
 * This JavaScript file serves as the backend for the Empirica experiment, responding to callbacks triggered by the client.
 */

// Imports
import { ClassicListenersCollector } from "@empirica/core/admin/classic";
import * as fs from "fs";
import axios from "axios";
import dotenv from "dotenv";
import findConfig from "find-config";
export const Empirica = new ClassicListenersCollector();
import { makePairs } from "./pairing";

// Load .env variables from either the server or local environment
let dotEnvPath = null;
if (fs.existsSync("/home/ubuntu/eli")) {
  dotEnvPath = findConfig(".env", { cwd: "/home/ubuntu/eli/experiment" });
} else if (fs.existsSync("/Users/eclagget/Code/experiment")) {
  dotEnvPath = findConfig(".env", {
    cwd: "/Users/eclagget/Code/experiment/chat-cooperation",
  });
}

if (dotEnvPath) {
  console.log("Loading dotenv file!");
  const envFile = dotenv.parse(fs.readFileSync(dotEnvPath));
  for (const key of Object.keys(envFile)) {
    process.env[key] = envFile[key];
  }
} else {
  console.log("Warning: No dotenv file!");
}

// Initialize global variables
const completionCodes = {
  task1: "C1CUDUAH",
  task2: "C1JF7BDA",
};

const gameParams = {
  version: "August 2024",
  test: false,

  // Payouts
  task1Pay: 3,
  task2Pay: 3,
  bonus: 3,
  maxBonusShare: 2, // Used in consent form, tutorial, and economic game to calculate bonus range
  shareMultiplier: 1.5,

  // Experiment parameters
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
  samplingType: "within", // within, between (passed pre-eval or not)
};

const botTexts = JSON.parse(
  fs.readFileSync(
    process.env["EXPERIMENT_DIR"] +
      "/" +
      process.env["EXPERIMENT_NAME"] +
      "/texts.json"
  )
);
botTexts["preEvalMessages"] = botTexts["messagesEvaluation"][2];

let gamePairs = {};
const playerStatus = {};
const preEvalTimers = {};
const chatChannelTopics = {};
const playerChatChannels = {};
const playerTypingChannels = {};
const submittedOpinionSurvey = new Set();

// Called when the "game" (experiment) starts, aka, when at least one participant joins the lobby
Empirica.on("game", (_, { game }) => {
  // Initialize parameters
  game.set("gameParams", gameParams);
  game.set("lobbyDuration", game.lobbyConfig.duration);
  game.set("submitCooperationDecision", false);
  game.set("currentStage", "onboarding");
});

// Called when a participant joins the experiment
Empirica.on("player", (ctx, { player, _ }) => {
  // Initialize the participant unless already initialized
  if (player.get("gameParams")) return;
  player.set("gameParams", gameParams);

  playerStatus[player.id] = {
    cooperationDecision: -1,
    cooperationType: "Share",
    submitReflectionSurvey: false,
  };
});

// Helper function to schedule messages from the chatbot during the chat step of the experiment
function startChatbotPrompting(game) {
  // Update current experiment stage
  game.set("currentStage", "mainDiscussion");

  // Send initial messages
  let currentMinute = 0;
  for (const k of Object.keys(chatChannelTopics)) {
    const topic = parseInt(chatChannelTopics[k].substring(1)) - 1;

    const msgs = [];
    msgs.push({
      sender: -1,
      sentTime: "just now",
      txt: botTexts["welcomeMessage"],
    });

    msgs.push({
      sender: -1,
      sentTime: "just now",
      txt: botTexts["customExamples"][topic],
    });

    game.set(k, msgs);
  }

  // Schedule latter messages
  const promptInterval = setInterval(() => {
    let nextPrompt = "";

    for (const k of Object.keys(chatChannelTopics)) {
      const topic = parseInt(chatChannelTopics[k].substring(1)) - 1;
      const p1Id = k.split("-")[1];
      const p2Id = k.split("-")[2];

      const p1 = game.players.filter((p) => p.id == p1Id)[0];
      const p2 = game.players.filter((p) => p.id == p2Id)[0];

      // Send messages every couple of minutes unless either the participant or their partner requests an early finish
      // If an early finish is requested, we break out of the schedule
      if (currentMinute == gameParams["followupDelay1"]) {
        nextPrompt = botTexts["customPrompts"][topic];
      } else if (
        currentMinute ==
        gameParams["followupDelay1"] + gameParams["followupDelay2"]
      ) {
        nextPrompt = botTexts["customFollowups"][topic];
      } else if (
        currentMinute == gameParams.chatTime - 1 &&
        gameParams.cooperationDiscussionTime > 0 &&
        !(p1.get("requestEarlyFinish") || p2.get("requestEarlyFinish"))
      ) {
        const cooperationDiscussionPrompts = [
          "Time's up! Thank you for discussing your opinions.",
          "Finally, you have a few minutes to discuss how to allocate your bonus.",
          "If you share your bonus with each other, you will both receive 2x the amount you share.",
          "You may also choose to keep your bonus to yourselves or pay to decrease your partner's bonus.",
        ];
        const cooperationDiscussionMsgs = cooperationDiscussionPrompts.map(
          (el) => {
            return {
              sender: -1,
              sentTime: "just now",
              txt: el,
            };
          }
        );
        const msgs = game.get(k) || [];
        game.set(k, [...msgs, ...cooperationDiscussionMsgs]);
        game.set("currentStage", "cooperationDiscussion");
      }

      if (nextPrompt.length > 0) {
        const msgs = game.get(k) || [];

        game.set(k, [
          ...msgs,
          {
            sender: -1,
            sentTime: "just now",
            txt: nextPrompt,
          },
        ]);
      }
    }

    // Must run Empirica.flush() for asynchronous updates to be processed
    Empirica.flush();
    currentMinute++;

    if (currentMinute > gameParams.chatTime) {
      clearInterval(promptInterval);
    }
  }, 60 * 1000); // Once per minute
}

// Function that runs when the lobby timer runs out
Empirica.onGameStart(({ game }) => {
  console.log("Making pairs");

  // Initialize a basic "game round" (just how Empirica works)
  const round = game.addRound({
    name: "Round",
  });

  // Add a timed stage to the "game round"
  round.addStage({
    name: "semi_asynchronous_steps",
    duration:
      (gameParams.chatTime +
        gameParams.cooperationDiscussionTime +
        gameParams.cooperationTime +
        gameParams.reflectionSurveyTime +
        gameParams.partnerAnswerTime) *
      60,
  });

  // Get participants who passed all preceding steps
  const players = game.players.filter((p) => submittedOpinionSurvey.has(p.id));

  // Assign all participants a partner
  const [pairs, topics, groups] = makePairs(players);

  gamePairs = pairs;
  gameGroups = groups;

  for (const player of game.players) {
    if (typeof pairs[player.id] == "undefined" || pairs[player.id] == -1) {
      // Could not make a pair for this participant
      console.log("could not pair player", player.get("participantIdentifier"));

      // Send the participant to the payment screen
      player.set("end", true);
      player.set("endReason", "noPair");

      continue;
    }

    // Create a unique channel for each pair to track their chat messages and typing status
    const partner = players.filter((p) => p.id == pairs[player.id])[0];

    let chatChannel = "c-" + player.id + "-" + partner.id;
    let typingChannel = "t-" + player.id + "-" + partner.id;
    if (Object.keys(playerChatChannels).includes(partner.id)) {
      chatChannel = playerChatChannels[partner.id];
      typingChannel = playerTypingChannels[partner.id];
    }

    playerChatChannels[player.id] = chatChannel;
    playerTypingChannels[player.id] = typingChannel;

    // Update participants to reflect their newly assigned partner and chat topic
    player.set("chatChannel", chatChannel);
    player.set("typingChannel", typingChannel);
    player.set("partnerId", partner.id);
    player.set("topic", topics[player.id]);
    player.set("completionCode", completionCodes["task2"]);
    player.set("group", groups[player.id]);
    player.set("partnerGroup", groups[partner.id]);
    player.set("msgCount", 2);

    partner.set("chatChannel", chatChannel);
    chatChannelTopics[chatChannel] = topics[player.id];
    partner.set("typingChannel", typingChannel);
    partner.set("partnerId", player.id);
    partner.set("topic", topics[partner.id]);
    partner.set("completionCode", completionCodes["task2"]);
    partner.set("group", groups[partner.id]);
    partner.set("partnerGroup", groups[player.id]);

    player.set("startTask2", true);
    player.set("msgUnderReview", "");
  }

  // Start the chat step of the experiment
  startChatbotPrompting(game);
});

// ----------------------------------------------------------------
// Custom callbacks
// ----------------------------------------------------------------

// Called when a participant submits the reCAPTCHA
Empirica.on("player", "submitRecaptcha", (_, { player, submitRecaptcha }) => {
  const data = submitRecaptcha;

  // Return if debugging
  if (data === true) {
    return;
  }

  // Run the reCAPTCHA test
  if ("data" in data && data["data"]) {
    const secret =
      process.env["DEPLOYMENT"] == "dev"
        ? "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe"
        : process.env["RECAPTCHA_SECRET"];
    const response = data["data"];

    axios
      .post(
        `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${response}`,
        {},
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
          },
        }
      )
      .then((resp) => {
        // Update participant with test results
        const respData = resp.data;
        if (respData.success) {
          player.set("passedRecaptcha", true);
          Empirica.flush(); // Allows asynchronous state updates
        } else {
          player.set("passedRecaptcha", false);
        }
      });
  }
});

// Called when a participant submits the consent form
Empirica.on(
  "player",
  "submitConsentForm",
  (_, { player, submitConsentForm }) => {
    // Ensure participants consent
    const consentFormResponse = submitConsentForm;
    let passedConsentForm = true;
    for (q in consentFormResponse) {
      if (consentFormResponse[q] != "yes") {
        passedConsentForm = false;
      }
    }

    // Update participant with whether they consent to participate in the experiment
    player.set("passedConsentForm", passedConsentForm);
  }
);

// Called when a participant submits the opinion survey
Empirica.on(
  "player",
  "submitOpinionSurvey",
  (_, { player, submitOpinionSurvey }) => {
    // Ensure that participants have an opinion about something
    let hasSomeOpinion = false;
    for (const q in submitOpinionSurvey) {
      if (submitOpinionSurvey[q] != "3") {
        hasSomeOpinion = true;
        break;
      }
    }

    // Stop the experiment for participants who report no opinion
    if (!hasSomeOpinion) {
      player.set("end", true);
      player.set("endReason", "noOpinion");
      player.exit("noOpinion");
    } else {
      submittedOpinionSurvey.add(player.id);
    }
  }
);

// Called when a participant submits the reflection survey
Empirica.on(
  "player",
  "submitReflectionSurvey",
  (_, { player, submitReflectionSurvey }) => {
    // Update participant status
    if (playerStatus[player.id])
      playerStatus[player.id].submitReflectionSurvey = true;
  }
);

// Called when a participant requests an early finish to the chat step
Empirica.on(
  "player",
  "requestEarlyFinish",
  (_, { player, requestEarlyFinish }) => {
    const chatChannel = player.get("chatChannel");
    const partnerId = gamePairs[player.id];
    const partner = player.currentGame.players.filter(
      (p) => p.id == partnerId
    )[0];
    partner.set("forceEarlyFinish", true);

    // Send the prompts for the cooperation discussion that follows the chat step
    const cooperationDiscussionPrompts = [
      "Time's up! Thank you for discussing your opinions.",
      "Finally, you have a few minutes to discuss how to allocate your bonus.",
      "If you share your bonus with each other, you will both receive 1.5x the amount you share.",
      "You may also choose to keep your bonus to yourselves or pay to decrease your partner's bonus.",
    ];
    const cooperationDiscussionMsgs = cooperationDiscussionPrompts.map((el) => {
      return {
        sender: -1,
        sentTime: "just now",
        txt: el,
      };
    });

    const msgs = player.currentGame.get(chatChannel) || [];

    player.currentGame.set(chatChannel, [
      ...msgs,
      ...cooperationDiscussionMsgs,
    ]);

    // Update the participants' current stage to cooperation discussion
    player.currentGame.set("currentStage", "cooperationDiscussion");
  }
);

// Called when a participant requests an early finish to the chat step so we can record the time
Empirica.on("game", "earlyFinishTime", (ctx, { game, earlyFinishTime }) => {
  const playerId = earlyFinishTime["playerId"];
  const finishTime = earlyFinishTime["finishTime"];

  const player = game.players.filter((p) => p.id == playerId)[0];
  const partnerId = gamePairs[player.id];
  const partner = game.players.filter((p) => p.id == partnerId)[0];

  player.set("earlyFinishTime", finishTime);
  partner.set("earlyFinishTime", finishTime);
});

// Called when a participant writes a report on their partner
Empirica.on("game", "partnerAnswer", (_, { game, partnerAnswer }) => {
  const partnerId = gamePairs[partnerAnswer.playerId];
  const partner = game.players.filter((player) => player.id == partnerId)[0];
  if (partner) {
    // Store this participant's opinion of their partner so the partner can read it
    partner.set("partnerAnswer", partnerAnswer.partnerAnswer);
  }
});

// Called when a participant submits their cooperation decision
Empirica.on(
  "game",
  "submitCooperationDecision",
  (_, { game, submitCooperationDecision }) => {
    const val = submitCooperationDecision;

    // Return if no data is present
    if (!val["playerId"]) {
      return;
    }

    const player = game.players.filter(
      (player) => player.id == val["playerId"]
    )[0];
    const partner = game.players.filter(
      (player) => player.id == gamePairs[val.playerId]
    )[0];

    // Store this participant's decision with their partner (used to calculate payment)
    partner.set("partnerCooperationDecision", val.cooperationDecision);
    partner.set("partnerCooperationType", val.cooperationType);

    playerStatus[val.playerId].cooperationDecision = val.cooperationDecision;
    playerStatus[val.playerId].cooperationType = val.cooperationType;

    player.set("completionCode", completionCodes["task2"]);

    // Set this pair as "finished" if both the participant and their partner has made a cooperation decision
    if (playerStatus[partner.id].cooperationDecision > -1) {
      partner.set("partnerFinished", true);
      player.set("partnerFinished", true);
    }
  }
);

// Called when each participant joins the lobby
Empirica.on("game", "startLobby", (_, { game }) => {
  // Start a timer when the first person finishes onboarding
  console.log("starting lobby");
  if (typeof game.get("lobbyTimeout") == "undefined") {
    const now = Date.now();
    if (game.lobbyConfig) {
      const expirationTS = now + game.lobbyConfig.duration / 1000000;
      game.set("lobbyTimeout", new Date(expirationTS).toISOString());
    }
  }
});

// Called if a participant reports their partner for bad behavior
Empirica.on("game", "reportPartner", (_, { game, reportPartner }) => {
  const p = game.players.filter((p) => p.id == reportPartner.victim)[0];
  const partner = game.players.filter(
    (p) => p.id == gamePairs[reportPartner.victim]
  )[0];

  // End the experiment for this pair
  if (p) {
    p.set("end", true);
    p.set("endReason", "reportPartner");
    p.exit("reportPartner");
  }
  if (partner) {
    partner.set("end", true);
    partner.set("endReason", "reported");
    partner.exit("reported");
  }
});

// Debugging
// (Unused) callback from Empirica
Empirica.onRoundStart(({ round }) => {
  console.log("round started");
});

// (Unused) callback from Empirica
Empirica.onStageStart(({ stage }) => {
  console.log("stage started");
});

// (Unused) callback from Empirica
Empirica.onStageEnded(({ stage }) => {
  console.log("stage ended");
});
// (Unused) callback from Empirica
Empirica.onRoundEnded(({ round }) => {});

// (Unused) callback from Empirica
Empirica.onGameEnded(({ game }) => {
  console.log("game ended");
});
