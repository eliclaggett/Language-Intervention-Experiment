let gameSamplingType = '';

// Find the index and value of the max element in a list
// Prefer stronger opinions
// If multiple answers have the same opinion difference, pick randomly
function maxWithIdx(data, exclude = []) {
  let idx = -1;
  const candidateIndices = [];

  if (data.length == 0) return [-1, -1];

  const filteredData = [];
  for (let i = 0; i < data.length; i++) {
    if (exclude.includes(i)) {
      continue;
    }
    filteredData.push(data[i]);
  }

  const max = Math.max(...filteredData);

  for (let i = 0; i < data.length; i++) {
    if (exclude.includes(i)) {
      continue;
    }

    if (data[i] == max) {
      candidateIndices.push(i);
    }
  }

  if (candidateIndices.length > 0) {
    idx = candidateIndices[Math.floor(candidateIndices.length * Math.random())];
  }

  return [idx, max];
}

// Find the index and value of the min element in a list
// Prefer stronger opinions
// If multiple answers have the same opinion difference, pick randomly
function minWithIdx(data, exclude = []) {
  let idx = -1;
  const candidateIndices = [];

  if (data.length == 0) return [-1, -1];

  const filteredData = [];
  for (let i = 0; i < data.length; i++) {
    if (exclude.includes(i)) {
      continue;
    }
    filteredData.push(data[i]);
  }

  const min = Math.min(...filteredData);

  for (let i = 0; i < data.length; i++) {
    if (exclude.includes(i)) {
      continue;
    }

    if (data[i] == min) {
      candidateIndices.push(i);
    }
  }

  if (candidateIndices.length > 0) {
    idx = candidateIndices[Math.floor(candidateIndices.length * Math.random())];
  }

  return [idx, min];
}

// Find the topic that these two players differ by exactly "diff" on
// (i.e. diff=0 is maximum agreement, diff=6 is maximum disagreement)
function ensureBestTopic(answers, playerKey, partnerKey, diff) {
  const p1Answers = answers[playerKey];
  const p2Answers = answers[partnerKey];

  const eligibleTopics = [];
  const eligibleTopicOpinionStrengths = [];
  for (const i in p1Answers) {
    const thisDiff = Math.abs(p1Answers[i] - p2Answers[i]);

    if (thisDiff == diff) {
      // Only allow participants on the agree side of the spectrum to be matched with participants on the disagree side
      if (
        (p1Answers[i] < 3 && p2Answers[i] > 3) ||
        (p1Answers[i] > 3 && p2Answers[i] < 3)
      ) {
        eligibleTopics.push(i);
        eligibleTopicOpinionStrengths.push(Math.abs(p1Answers[i] - 2) + Math.abs(p2Answers[i] - 2));
      } else if (
        (p1Answers[i] < 2 && p2Answers[i] > 2) ||
        (p1Answers[i] > 2 && p2Answers[i] < 2)
      ) {
        // For Prolific, allow out-group pairs with weak opinion differences
        eligibleTopics.push(i);
        eligibleTopicOpinionStrengths.push(Math.abs(p1Answers[i] - 2) + Math.abs(p2Answers[i] - 2));
      } else if (
        (diff == 0 || diff == 1) &&
        (
          (p1Answers[i] < 3 && p2Answers[i] < 3) ||
          (p1Answers[i] > 3 && p2Answers[i] > 3)
        )
      ) {
        // When we allow in-group pairs, only make in-group pairs that have some opinion
        eligibleTopics.push(i);
        eligibleTopicOpinionStrengths.push(Math.abs(p1Answers[i] - 2) + Math.abs(p2Answers[i] - 2));
      }
    }
  }

  let [idx, maxOpinionStrength] = maxWithIdx(eligibleTopicOpinionStrengths);

  if (idx == -1) {
    return [-1, -1];
  } else {
    // Randomly pick from topics if there is a tie
    let countWithSameStrength = 0;
    for (let i = 0; i < eligibleTopicOpinionStrengths.length; i++) {
      if (eligibleTopicOpinionStrengths[i] == maxOpinionStrength) {
        countWithSameStrength++;
      }
    }
    const useThisTopic = Math.round(Math.random() * countWithSameStrength);
    let maxIdx = 0;
    for (let i = 0; i < eligibleTopicOpinionStrengths.length; i++) {
      if (eligibleTopicOpinionStrengths[i] == maxOpinionStrength) {
        if (maxIdx == useThisTopic) {
          idx = i;
        }
        maxIdx++;
      }
    }

    return [eligibleTopics[idx], maxOpinionStrength];
  }
}

// Find a partner that has an opinion difference of exactly "diff" with this participant on any topic
// (i.e. diff=0 is maximum agreement, diff=6 is maximum disagreement)
function ensureBestPartner(answers, diffs, playerKey, diff, exclude) {
  const eligiblePartners = [];
  const eligiblePartnerTopics = [];
  const eligiblePartnerOpinionStrengths = [];
  for (const partnerKey in diffs[playerKey]) {

    if (exclude.includes(partnerKey)) {
      continue;
    }

    if (diffs[playerKey][partnerKey].includes(diff)) {
      if (gameSamplingType == 'within' && (playerPassEval[playerKey] != playerPassEval[partnerKey])) {
        continue;
      } else if (gameSamplingType == 'between' && playerPassEval[playerKey] == playerPassEval[partnerKey]) {
        continue;
      }
      // else if (Param.samplingType == 'random') {
      // Do nothing.
      // }

      // This player is eligible
      const [topic, strength] = ensureBestTopic(answers, playerKey, partnerKey, diff);

      if (topic != -1) {
        eligiblePartners.push(partnerKey);
        eligiblePartnerTopics.push(topic);
        eligiblePartnerOpinionStrengths.push(strength);
      }
    }
  }

  let [idx, maxOpinionStrength] = maxWithIdx(eligiblePartnerOpinionStrengths);

  if (idx == -1) {
    return [-1, -1];
  } else {
    return [eligiblePartners[idx], eligiblePartnerTopics[idx]];
  }
}

const playerPassEval = {};
const pairs = {};
const playerGroups = {}; // 0=ingroup, 1=outgroup
const pairTopics = {};

const playerAnswers = {};
const answerDiffs = {};
const pairwiseMaxDiffs = {};
const pairwiseMinDiffs = {};

function makeOutGroupPairs(dist, pId) {
  // Ensure this is an optimal pair and optimal topic
  const [mxPartner, topic] = ensureBestPartner(playerAnswers, answerDiffs, pId, dist, Object.keys(pairs));

  if (mxPartner == -1) { return false; }

  pairs[pId] = mxPartner;
  pairs[mxPartner] = pId;
  playerGroups[pId] = 0;
  playerGroups[mxPartner] = 1;

  pairTopics[pId] = topic;
  pairTopics[mxPartner] = topic;
  return true;
}
function makeInGroupPairs(dist, pId) {
  // Ensure this is an optimal pair
  const [mnPartner, topic] = ensureBestPartner(playerAnswers, answerDiffs, pId, dist, Object.keys(pairs));

  if (mnPartner == -1) { return false; }

  pairs[pId] = mnPartner;
  pairs[mnPartner] = pId;
  playerGroups[pId] = 0;
  playerGroups[mnPartner] = 0;

  pairTopics[pId] = topic;
  pairTopics[mnPartner] = topic;
  return true;
}


// END -- Pairing helper functions


function makePairs(players, samplingType) {
  gameSamplingType = samplingType;
  
  for (const player of players) {
    playerAnswers[player.id] = player.get('submitOpinionSurvey');
    playerPassEval[player.id] = player.get('passEval');
  }

  for (const playerIdx in playerAnswers) {
    answerDiffs[playerIdx] = {};
    for (const partnerIdx in playerAnswers) {
      if (partnerIdx != playerIdx) {
        answerDiffs[playerIdx][partnerIdx] = [];
        for (const i in playerAnswers[partnerIdx]) {
          answerDiffs[playerIdx][partnerIdx].push(Math.abs(playerAnswers[partnerIdx][i] - playerAnswers[playerIdx][i]));
        }
      }
    }
  }

  // Select pairwise min and max answer distances
  for (const playerIdx in answerDiffs) {
    pairwiseMaxDiffs[playerIdx] = {};
    pairwiseMinDiffs[playerIdx] = {};
    for (const partnerIdx in answerDiffs[playerIdx]) {
      const [argmx, mx] = maxWithIdx(answerDiffs[playerIdx][partnerIdx]);
      const [argmn, mn] = minWithIdx(answerDiffs[playerIdx][partnerIdx]);

      pairwiseMaxDiffs[playerIdx][partnerIdx] = mx;
      pairwiseMinDiffs[playerIdx][partnerIdx] = mn;
    }
  }

  for (const playerIdx in answerDiffs) {

    if (typeof (pairs[playerIdx]) != 'undefined') { continue; }

    let pairType = Math.round(Math.random()); // TODO: PROD Random making out-group pairs (1=out-group 0=in-group)
    // let pairType = 1; // TODO: PROD Prioritize making out-group pairs (1=out-group 0=in-group)

    if (pairType == 1) {
      let success = makeOutGroupPairs(6, playerIdx);
      if (!success) { success = makeOutGroupPairs(5, playerIdx); }
      if (!success) { success = makeOutGroupPairs(4, playerIdx); }
      if (!success) { success = makeOutGroupPairs(3, playerIdx); }
      if (!success) { success = makeOutGroupPairs(2, playerIdx); }

      if (!success) {
        pairType = 0;
        success = makeInGroupPairs(0, playerIdx);
      }
      if (!success) { success = makeInGroupPairs(1, playerIdx); }
    } else {
      let success = makeInGroupPairs(0, playerIdx);
      if (!success) { success = makeInGroupPairs(1, playerIdx); }

      if (!success) {
        pairType = 1;
        success = makeInGroupPairs(6, playerIdx);
      }
      if (!success) { success = makeOutGroupPairs(5, playerIdx); }
      if (!success) { success = makeOutGroupPairs(4, playerIdx); }
      if (!success) { success = makeOutGroupPairs(3, playerIdx); }
      if (!success) { success = makeOutGroupPairs(2, playerIdx); }
    }
  }

  return [pairs, pairTopics, playerGroups];
}

export { makePairs };