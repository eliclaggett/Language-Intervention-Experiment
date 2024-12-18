/*
 * Filename: ReflectionSurvey.jsx
 * Author: Elijah Claggett
 *
 * Description:
 * This ReactJS file surveys participants about their understanding of the chat and attitude toward their partner(s).
 */

// Imports
import * as React from "react";
import {
  Button,
  Box,
  Grid,
  Typography,
  Stack,
  FormControl,
  FormLabel,
  Textarea,
  Select,
  Slider,
  Option,
} from "@mui/joy";
import { useState, useEffect } from "react";
import {
  usePlayer,
  useGame,
  useStage,
  useStageTimer,
} from "@empirica/core/player/classic/react";
import { msToTime } from "../utils/formatting.js";
import "../chat.scss";
import {
  MainContainer,
  ChatContainer,
  MessageList,
  Message,
} from "@chatscope/chat-ui-kit-react";
import LikertQuestion from "../components/LikertQuestion.jsx";
import IOSQuestion from "../components/IOSQuestion.jsx";

const topics = [
  "I would want my kids to be taught evolution as a fact of biology",
  "My second amendment right to bear arms should be protected",
  "I support funding the military",
  "Our children are being indoctrinated at school with LGBT messaging",
  "I would pay higher taxes to support climate change research",
  "Restrictions to stop the spread of COVID-19 went too far",
  "I want stricter immigration requirements into the U.S.",
];

export default function ReflectionSurvey({ next }) {
  const player = usePlayer();
  const playerId = player.id;
  const partnerId = player.get("partnerId");
  const game = useGame();
  const { experimentCondition, _ } = game.get("treatment");
  const stage = useStage();
  const stageTimer = useStageTimer();

  const alreadySubmitted = player.get("submittedSurvey") || false;
  if (alreadySubmitted) {
    next();
  }

  let topic = player.get("topic") || -1;
  if (typeof topic == "string") {
    topic = parseInt(topic.substring(1));
  }

  const [step, setStep] = useState(1);
  const [partnerOpinion, setPartnerOpinion] = useState("");
  const [feelingThermometer, setFeelingThermometer] = useState(3);
  const [politics, setPolitics] = useState(null);
  const [gender, setGender] = useState(null);
  const [age, setAge] = useState(null);
  const [race, setRace] = useState(null);
  const [school, setSchool] = useState(null);
  const [income, setIncome] = useState(null);
  const [opinionChangeValue, setOpinionChangeValue] = useState(null);
  const [conversationDifficultyValue, setConversationDifficultyValue] =
    useState(null);
  const [aiIOS, setAIIOS] = useState(null);
  const [partnerIOS, setPartnerIOS] = useState(null);
  const [argumentStrengthValue, setArgumentStrengthValue] = useState(null);
  const [partnerArgumentStrengthValue, setPartnerArgumentStrengthValue] =
    useState(null);

  const isDisabled =
    (step == 1 &&
      (!partnerOpinion ||
        !feelingThermometer ||
        !conversationDifficultyValue ||
        !opinionChangeValue)) ||
    (step == 2 && !politics);

  const feelingThermometerMarks = [
    {
      value: 0,
      label: "Very cold - I never want to speak to this person again",
    },
    {
      value: 1,
      label: "Cold",
    },
    {
      value: 2,
      label: "Slightly cold",
    },
    {
      value: 3,
      label: "No feeling",
    },
    {
      value: 4,
      label: "Slightly warm",
    },
    {
      value: 5,
      label: "Warm",
    },
    {
      value: 6,
      label: "Very warm - I wish I knew this person in real life",
    },
  ];

  const chatLog = [];
  const chatChannel = player.get("chatChannel");
  const chatData = game.get(chatChannel) || [];
  let msgKey = "m";
  let msgIdx = 0;
  for (const msg of chatData) {
    let msgClass = "";
    if (msg.sender == -1) {
      msgClass = "botMsg";
    } else if (msg.sender == "-" + playerId) {
      msgClass = "youLeftMsg";
    } else if (msg.sender == "-" + partnerId) {
      msgClass = "partnerLeftMsg";
    }

    chatLog.push(
      <Message
        className={msgClass}
        model={{
          message: msg.txt,
          sentTime: "just now",
          sender: "p" + msg.sender,
          direction:
            msg.sender == playerId || msg.sender == "-" + playerId
              ? "outgoing"
              : "incoming",
          position: "single",
        }}
        key={msgKey + msgIdx}
      />
    );
    msgIdx++;
  }

  function handleRadioButtonChange(evt) {
    setCurrentValue(evt.target.value);
    setRadioButtonVals((radioButtonVals) => ({
      ...radioButtonVals,
      [evt.target.name]: evt.target.value,
    }));
  }

  function handleSliderChange(evt) {
    setFeelingThermometer(evt.target.value);
  }

  function handleButtonClick(evt) {
    if (step == 1) {
      setStep(step + 1);
    } else {
      player.set("submitReflectionSurvey", {
        partnerAnswer: partnerAnswer,
        partnerOpinion: partnerOpinion,
        feelingThermometer: feelingThermometer,
        politics: politics,
        gender: gender,
        age: age,
        race: race,
        school: school,
        income: income,
        suggestionReaction: suggestionReaction,
        difficulty: conversationDifficultyValue,
        opinionSurvey: opinionChangeValue,
        argumentStrength: argumentStrengthValue,
        partnerArgumentStrength: partnerArgumentStrengthValue,
        partnerIOS: partnerIOS,
        aiIOS: aiIOS,
      });

      game.set("partnerAnswer", {
        playerId: player.id,
        partnerAnswer: partnerOpinion,
      });

      next();
    }
  }

  useEffect(() => {
    if (step == 1) {
      document
        .querySelectorAll(".feelingThermometer .MuiSlider-markLabel")
        .forEach((el) => el.classList.remove("active"));
      document
        .querySelector(
          '.feelingThermometer .MuiSlider-markLabel[data-index="' +
            feelingThermometer +
            '"]'
        )
        .classList.add("active");
    }
  }, [feelingThermometer]);

  let timeLeftTxt = "";
  if (stage && stage.get("name") == "semi_asynchronous_steps") {
    let timeLeft = stageTimer?.remaining ? stageTimer.remaining : 0;
    timeLeftTxt = (
      <span style={{ color: "rgb(102, 93, 245)" }}>
        {msToTime(timeLeft)} remaining to finish the survey.
        <br />
      </span>
    );
  }

  function handleOpinionChange(e) {
    setOpinionChangeValue(e.target.value);
  }
  function handleDifficultyChange(e) {
    setConversationDifficultyValue(e.target.value);
  }
  function handleArgumentStrengthChange(e) {
    setArgumentStrengthValue(e.target.value);
  }
  function handlePartnerArgumentStrengthChange(e) {
    setPartnerArgumentStrengthValue(e.target.value);
  }
  function handlePartnerIOSChange(e) {
    setPartnerIOS(e.target.value);
  }
  function handleAIIOSChange(e) {
    setAIIOS(e.target.value);
  }

  let aiIOSUI = "";
  if (experimentCondition != "control") {
    aiIOSUI = (
      <>
        <Typography level="h3" sx={{ pt: 2 }}>
          Select the picture below which best describes your relationship with
          the <span style={{ color: "rgb(102, 93, 245)" }}>AI suggestions</span>
          .
        </Typography>
        <IOSQuestion onChange={handleAIIOSChange} value={aiIOS} type="ai" />
      </>
    );
  }

  let stepUI = (
    <>
      <Stack
        sx={{
          maxWidth: "50%",
          minWidth: "34rem",
          mx: "auto",
          mt: "10rem",
        }}
        gap={6}
      >
        <div>
          <Typography level="h2">Reflection Survey</Typography>
          <Typography level="body-md" className="reflectionSurveyHeaderTxt">
            {timeLeftTxt}
            Please answer these questions in at least a few sentences. (1/2)
          </Typography>
        </div>
        <FormControl>
          <FormLabel>
            What is your partner's opinion about the conversation topic?
          </FormLabel>
          <p style={{ paddingBottom: "0.5em" }}>
            Describe the main points of their argument and their reaction to
            hearing your beliefs.
          </p>
          <Textarea
            minRows={8}
            value={partnerOpinion}
            onChange={(e) => {
              setPartnerOpinion(e.target.value);
            }}
            placeholder="Type answer here"
          />
        </FormControl>
        <FormControl className="small">
          <FormLabel>How do you feel about this statement?</FormLabel>
          <p>"{topics[topic - 1]}"</p>
          <LikertQuestion
            name="opinionChange"
            prompt=""
            onChange={handleOpinionChange}
            value={opinionChangeValue}
          />
        </FormControl>
        <FormControl className="small">
          <FormLabel>How difficult was having this conversation?</FormLabel>
          <LikertQuestion
            name="conversationDifficulty"
            prompt=""
            onChange={handleDifficultyChange}
            value={conversationDifficultyValue}
            type="difficulty"
          />
        </FormControl>
        <FormControl className="small">
          <FormLabel>How would you rate your argumentation skills?</FormLabel>
          <LikertQuestion
            name="conversationDifficulty"
            prompt=""
            onChange={handleArgumentStrengthChange}
            value={argumentStrengthValue}
            type="strength"
          />
        </FormControl>
        <FormControl className="small">
          <FormLabel>
            How would you rate your partner's argumentation skills?
          </FormLabel>
          <LikertQuestion
            name="conversationDifficulty"
            prompt=""
            onChange={handlePartnerArgumentStrengthChange}
            value={partnerArgumentStrengthValue}
            type="strength"
          />
        </FormControl>
      </Stack>
      <Stack
        sx={{
          minWidth: "20rem",
          width: "20%",
          maxWidth: "calc(100% - 33rem)",
          mt: "10rem",
          justifySelf: "center",
          mx: "auto",
        }}
        className="rightLog"
      >
        <Typography level="h2" sx={{ mb: 1 }}>
          Chat Log
        </Typography>
        <MainContainer style={{ maxHeight: "80rem" }}>
          <ChatContainer style={{ height: "100%" }}>
            <MessageList>{chatLog}</MessageList>
          </ChatContainer>
        </MainContainer>
      </Stack>
      <Stack gap={4} sx={{ pt: 4, px: 3 }}>
        <div>
          <Typography level="h3">
            How would you rate your feelings toward your partner?
          </Typography>
          <Box sx={{ height: 200, mt: 3 }}>
            <Slider
              orientation="vertical"
              aria-label="Always visible"
              defaultValue={3}
              step={1}
              marks={feelingThermometerMarks}
              max={6}
              min={0}
              valueLabelDisplay="off"
              className="feelingThermometer"
              onChange={handleSliderChange}
            />
          </Box>
        </div>
        <Typography level="h3" sx={{ pt: 2 }}>
          Select the picture below which best describes your relationship with
          your <span style={{ color: "rgb(102, 93, 245)" }}>partner</span>.
        </Typography>
        <IOSQuestion
          onChange={handlePartnerIOSChange}
          value={partnerIOS}
          type="partner"
        />
        {aiIOSUI}

        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            width: "100%",
            flexDirection: "row",
          }}
        >
          <Button
            sx={{ my: 2 }}
            onClick={handleButtonClick}
            disabled={isDisabled}
          >
            Continue
          </Button>
        </Box>
      </Stack>
      <Stack
        sx={{
          minWidth: "20rem",
          width: "20%",
          maxWidth: "calc(100% - 33rem)",
          mt: "10rem",
          justifySelf: "center",
          mx: "auto",
        }}
        className="bottomLog"
      >
        <Typography level="h2" sx={{ mb: 1 }}>
          Chat Log
        </Typography>
        <MainContainer style={{ maxHeight: "50rem" }}>
          <ChatContainer style={{ height: "100%" }}>
            <MessageList>{chatLog}</MessageList>
          </ChatContainer>
        </MainContainer>
      </Stack>
    </>
  );

  if (step == 2) {
    stepUI = (
      <>
        <Stack
          sx={{
            maxWidth: "50%",
            mx: "auto",
            mt: "10rem",
          }}
          gap={6}
        >
          <div>
            <Typography level="h2">Reflection Survey</Typography>
            <Typography level="body-md" className="reflectionSurveyHeaderTxt">
              {timeLeftTxt}
              Please answer the following questions. (2/2)
            </Typography>
          </div>
          <FormControl>
            <FormLabel
              id="select-field-demo-label"
              htmlFor="select-field-demo-button"
            >
              What is your political affiliation?
              <span className="textRed">*</span>
            </FormLabel>
            <Select
              sx={{ maxWidth: "15rem" }}
              onChange={(e, newVal) => {
                setPolitics(newVal);
              }}
            >
              <Option value="left">Left</Option>
              <Option value="left-leaning">Left-leaning</Option>
              <Option value="center">Center</Option>
              <Option value="right-leaning">Right-leaning</Option>
              <Option value="right">Right</Option>
              <Option value="other">Other</Option>
              <Option value="no_answer">Decline to answer</Option>
            </Select>
          </FormControl>

          <FormControl>
            <FormLabel
              id="select-field-demo-label"
              htmlFor="select-field-demo-button"
            >
              What is your gender?
            </FormLabel>
            <Select
              sx={{ maxWidth: "15rem" }}
              onChange={(e, newVal) => {
                setGender(newVal);
              }}
            >
              <Option value="female">Female</Option>
              <Option value="male">Male</Option>
              <Option value="non-binary">Non-binary</Option>
              <Option value="other">Other</Option>
              <Option value="no_answer">Decline to answer</Option>
            </Select>
          </FormControl>

          <FormControl>
            <FormLabel
              id="select-field-demo-label"
              htmlFor="select-field-demo-button"
            >
              Which category includes your age?
            </FormLabel>
            <Select
              sx={{ maxWidth: "15rem" }}
              onChange={(e, newVal) => {
                setAge(newVal);
              }}
            >
              <Option value="18-29">18-29</Option>
              <Option value="30-39">30-39</Option>
              <Option value="40-49">40-49</Option>
              <Option value="50-59">50-59</Option>
              <Option value="over60">60 or older</Option>
              <Option value="no_answer">Decline to answer</Option>
            </Select>
          </FormControl>

          <FormControl>
            <FormLabel
              id="select-field-demo-label"
              htmlFor="select-field-demo-button"
            >
              How would you identify your race and ethnicity?
            </FormLabel>
            <Select
              sx={{ maxWidth: "15rem" }}
              onChange={(e, newVal) => {
                setRace(newVal);
              }}
            >
              <Option value="asian">Asian / Pacific Islander</Option>
              <Option value="black">Black / African American</Option>
              <Option value="hispanic">Hispanic / Latino</Option>
              <Option value="white">
                White, Caucasian, European (not Hispanic)
              </Option>
              <Option value="native">American Indian / Native American</Option>
              <Option value="multi">Multiple ethnicities</Option>
              <Option value="other">Other</Option>
              <Option value="no_answer">Decline to answer</Option>
            </Select>
          </FormControl>

          <FormControl>
            <FormLabel
              id="select-field-demo-label"
              htmlFor="select-field-demo-button"
            >
              What is the highest grade of school or year of college you
              completed?
            </FormLabel>
            <Select
              sx={{ maxWidth: "15rem" }}
              onChange={(e, newVal) => {
                setSchool(newVal);
              }}
            >
              <Option value="high_school">High school or less</Option>
              <Option value="some_college">Some college (1-3 years)</Option>
              <Option value="college">College graduate (Bachelors)</Option>
              <Option value="masters">Masters</Option>
              <Option value="gt_masters">Above Masters degree</Option>
              <Option value="other">Other</Option>
              <Option value="no_answer">Decline to answer</Option>
            </Select>
          </FormControl>

          <FormControl>
            <FormLabel
              id="select-field-demo-label"
              htmlFor="select-field-demo-button"
            >
              About what wage and salary did you receive in the last year
              (including any type of income such as pension)?
            </FormLabel>
            <Select
              sx={{ maxWidth: "15rem" }}
              onChange={(e, newVal) => {
                setIncome(newVal);
              }}
            >
              <Option value="under20000">Less than $20,000</Option>
              <Option value="20000-34999">$20,000 - $34,999</Option>
              <Option value="35000-49999">$35,000 - $49,999</Option>
              <Option value="50000-74999">$50,000 - $74,999</Option>
              <Option value="75000-99999">$75,000 - $99,999</Option>
              <Option value="over100000">Over $100,000</Option>
              <Option value="no_answer">Decline to answer</Option>
            </Select>
          </FormControl>

          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              width: "100%",
              flexDirection: "row",
            }}
          >
            <Button
              sx={{ my: 2 }}
              onClick={handleButtonClick}
              disabled={isDisabled}
            >
              Continue
            </Button>
          </Box>
        </Stack>
        <Stack
          sx={{
            minWidth: "20rem",
            width: "20%",
            // maxWidth: 'calc(50% - 2em)',
            maxWidth: "calc(100% - 33rem)",
            mt: "10rem",
            justifySelf: "center",
            mx: "auto",
          }}
        >
          <Typography level="h2" sx={{ mb: 1 }}>
            Chat Log
          </Typography>
          <MainContainer style={{ maxHeight: "50rem" }}>
            <ChatContainer style={{ height: "100%" }}>
              <MessageList>{chatLog}</MessageList>
            </ChatContainer>
          </MainContainer>
        </Stack>
      </>
    );
  }

  return (
    <Grid
      maxWidth="100vw"
      sx={{
        width: "85%",
        maxWidth: "60rem",
        minWidth: "40rem",
        mx: "auto",
      }}
      container
    >
      {stepUI}
    </Grid>
  );
}
