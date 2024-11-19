/*
 * Filename: Tutorial.jsx
 * Author: Elijah Claggett
 *
 * Description:
 * This ReactJS file is the main tutorial of the experimental procedure.
 */

// Imports
import * as React from "react";
import {
  Alert,
  Button,
  Box,
  Container,
  FormControl,
  FormLabel,
  Typography,
  Stack,
  Sheet,
  Radio,
  RadioGroup,
} from "@mui/joy";
import WarningIcon from "@mui/icons-material/Warning";
import { usePlayer } from "@empirica/core/player/classic/react";
import { useState, useEffect } from "react";
import { formatMoney } from "../utils/formatting";
import ProgressList from "../components/ProgressList";
import { Done, Warning } from "@mui/icons-material";

export default function Tutorial({ next }) {
  const player = usePlayer();
  const gameParams = player.get("gameParams");
  if (!gameParams) window.location.reload();
  const correctAnswers = [1, 2, 2, 3];
  const totalBasePay = gameParams.task1Pay + gameParams.task2Pay;
  const [step, setStep] = useState(1);
  const [nextButtonDisabled, setNextButtonDisabled] = useState(false);
  const [backButtonDisabled, setBackButtonDisabled] = useState(true);
  const [errorDisplay, setErrorDisplay] = useState("none");
  const [q4SuccessDisplay, setQ4SuccessDisplay] = useState("none");
  const [backNextDisplay, setBackNextDisplay] = useState("flex");
  const [lowBonusExplanation, setLowBonusExplanation] = useState("");
  const exampleShareAmt = 1;

  function shuffleArray(array) {
    // Reference: https://stackoverflow.com/questions/2450954
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  const q2Answers = [
    [1, "Completing a survey of your opinions toward various topics"],
    [2, "Discussion with a partner, then describing their beliefs"],
    [3, "None of these options"],
  ];
  const q3Answers = [
    [1, "Similar opinions to me"],
    [2, "Different opinions from me"],
  ];

  const q4Answers = [
    [1, formatMoney(gameParams.bonus)],
    [2, formatMoney(0)],
    [
      3,
      formatMoney(
        gameParams.bonus -
          exampleShareAmt +
          exampleShareAmt * gameParams.shareMultiplier
      ),
    ], // Correct
    [
      4,
      formatMoney(
        gameParams.bonus + exampleShareAmt * gameParams.shareMultiplier
      ),
    ],
  ];

  const [q2RadioButtons, setQ2RadioButtons] = useState([]);
  const [q3RadioButtons, setQ3RadioButtons] = useState([]);
  const [q4RadioButtons, setQ4RadioButtons] = useState([]);

  useEffect(() => {
    const tmpQ2RadioButtons = [];
    const tmpQ3RadioButtons = [];
    const tmpQ4RadioButtons = [];

    shuffleArray(q2Answers);
    for (const q of q2Answers) {
      tmpQ2RadioButtons.push(
        <Radio
          value={q[0]}
          label={q[1]}
          variant="outlined"
          key={"q2-" + q[0]}
        />
      );
    }

    shuffleArray(q3Answers);
    for (const q of q3Answers) {
      tmpQ3RadioButtons.push(
        <Radio
          value={q[0]}
          label={q[1]}
          key={"q3-" + q[0]}
          variant="outlined"
        />
      );
    }

    shuffleArray(q4Answers);
    for (const q of q4Answers) {
      tmpQ4RadioButtons.push(
        <Radio
          value={q[0]}
          label={q[1]}
          key={"q4-" + q[0]}
          variant="outlined"
        />
      );
    }
    setQ2RadioButtons(tmpQ2RadioButtons);
    setQ3RadioButtons(tmpQ3RadioButtons);
    setQ4RadioButtons(tmpQ4RadioButtons);
  }, []);

  // Logic to handle interactions with this page
  const [radioButtonVals, setRadioButtonVals] = useState();

  const handleRadioButtonChange = (evt) => {
    setRadioButtonVals((radioButtonVals) => ({
      ...radioButtonVals,
      [evt.target.name]: evt.target.value,
    }));

    if (evt.target.value == correctAnswers[step - 1]) {
      if (step == 4) {
        setQ4SuccessDisplay("");
      }
      setErrorDisplay("none");
      setNextButtonDisabled(false);
    } else {
      setErrorDisplay("");
      if (step == 4) {
        setQ4SuccessDisplay("none");
      }
      setNextButtonDisabled(true);
    }
  };

  function handleBack() {
    if (step > 1) {
      setStep(step - 1);
    }
    if (step == 2) {
      setBackButtonDisabled(true);
    }
  }
  function handleWhy() {
    setLowBonusExplanation(
      <>
        <br />
        <p>
          Remember, your default bonus is {formatMoney(gameParams.bonus)}. If
          you share {formatMoney(gameParams.maxBonusShare)} and your partner
          shares {formatMoney(0)}, your final bonus will decrease to{" "}
          {formatMoney(gameParams.bonus - gameParams.maxBonusShare)}.
        </p>
        <br />
        <p>Choosing to share is a risk.</p>
      </>
    );
  }

  function handleNext() {
    if (
      radioButtonVals &&
      radioButtonVals["q" + (step + 1)] == correctAnswers[step]
    ) {
      setNextButtonDisabled(false);
    } else {
      setNextButtonDisabled(true);
    }

    if (step == 5) {
      // Mark that the tutorial was finished
      player.set("passedTutorial", true);
      next();
    } else if (step == 4) {
      setBackNextDisplay("none");
      setWarningDisplay("flex");
      setQ4SuccessDisplay("none");
    } else {
      setStep(step + 1);
      setBackButtonDisabled(false);
    }
  }

  function handleFinishTutorial() {
    player.set("passedTutorial", true);
    next();
  }

  // Logic to move to next step or stop the experiment
  const passedTutorial = player.get("passedTutorial");
  if (passedTutorial === true) {
    next();
  }

  // Custom UI Elements
  const [warningDisplay, setWarningDisplay] = useState("none");

  // Step 1
  let tutorialStepUI = (
    <Stack gap={1}>
      <Typography level="h2" textAlign="center">
        Tutorial
      </Typography>
      <p>
        As you read through this short tutorial, please answer the three
        comprehension questions that look like this:
      </p>
      <FormControl>
        <FormLabel>
          Do you need to answer comprehension questions about this tutorial?
        </FormLabel>
        <RadioGroup
          name="q1"
          onChange={handleRadioButtonChange}
          defaultValue="1"
        >
          <Radio value="1" label="Yes" variant="outlined" />
          <Radio value="2" label="No" variant="outlined" />
        </RadioGroup>
      </FormControl>
      <p>
        We only use these questions to ensure you understand the study details.
      </p>
    </Stack>
  );
  if (step == 2) {
    tutorialStepUI = (
      <Stack gap={1}>
        <img
          src="/images/tutorial_study_desc.svg"
          style={{ marginBottom: "-8em" }}
        />
        <Typography level="h2" textAlign="center">
          Study Description
        </Typography>

        <Typography level="h3" sx={{ pt: 4 }}>
          Goal
        </Typography>
        <Typography level="body-md">
          In this study, we are measuring the quality and diversity arguments
          made by people with various perspectives on contemporary political
          issues. By participating, you have the opportunity to contribute to a
          large-scale analysis comparing the arguments of people from your side
          with those across the spectrum. This is your chance to take a stand
          and reflect on what matters most to you and those around you.
        </Typography>
        <Typography level="h3" sx={{ pt: 4 }}>
          Steps
        </Typography>
        <Typography>
          This study has two parts. Within each part you will complete multiple
          short tasks. You have a fixed amount of time to complete each part.
          Please complete all tasks displayed at the top of the page within the
          allotted time.
        </Typography>
        <Typography level="h4" sx={{ pt: 2 }}>
          1) Preparation
        </Typography>
        <Typography level="body-md">
          First, you will complete a survey about your opinions on various
          topics. Please indicate your level of interest in the topic by the
          strength of your responses.
          <br />
          <br />
          Then, you will enter a waiting room until all study participants are
          ready to be assigned a discussion partner. The maximum time you will
          wait will be displayed on the page. In the event you are unable to be
          paired, you will be paid {formatMoney(gameParams.task1Pay)} for
          completing this part of the study.
        </Typography>
        <Typography level="h4" sx={{ pt: 2 }}>
          2) Discussion & Argumentation
        </Typography>
        <Typography level="body-md">
          This is the main focus of our study. You will be paired with another
          participant to debate an assigned topic. Don't worry; there is no
          winning or losing. Research simply shows that interacting with others
          helps with self-reflection and forming better arguments (
          <a
            className="link"
            href="https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2021.631203/full"
            target="__blank"
          >
            source
          </a>
          ).
          <br />
          <br />
          We will kick-start the discussion by providing a news article to
          respond to, before opening up the discussion to hear your general
          beliefs. Afterward, to aid in our analysis, you will describe your
          understanding of your partner's beliefs. You will be paid an
          additional {formatMoney(gameParams.task2Pay)} for completing this part
          of the study.
        </Typography>
        <FormControl sx={{ pt: 4 }}>
          <FormLabel>What does the main part of the study involve?</FormLabel>
          <RadioGroup
            name="q2"
            onChange={handleRadioButtonChange}
            defaultValue=""
          >
            {q2RadioButtons}
          </RadioGroup>
        </FormControl>
      </Stack>
    );
  } else if (step == 3) {
    tutorialStepUI = (
      <Stack gap={1}>
        <img src="/images/undraw_forms_re_pkrt.svg" />
        <Typography level="h2" textAlign="center">
          How we'll make pairs
        </Typography>
        <Typography level="body-md">
          After the initial survey of your opinions, we create multiple groups
          of participants based on the results. Everyone in your group will
          share the the same opinions as you. Once these groups are created, we
          randomly form pairs either within or across groups:
        </Typography>
        <ul
          style={{ listStyle: "disc", margin: "0.5em 0", padding: "0 1.5em" }}
        >
          <li>
            If you are paired within your group, your partner will share your
            opinions
          </li>
          <li>
            If you are paired across groups, your partner will have an opposing
            view
          </li>
        </ul>
        <Typography level="body-md">
          Then, you will have {gameParams.chatTime} minutes to discuss your
          opinions with your assigned partner.
        </Typography>
        <FormControl>
          <FormLabel>
            If my partner is from a different group, they will have...
          </FormLabel>
          <RadioGroup
            name="q3"
            onChange={handleRadioButtonChange}
            defaultValue=""
          >
            {q3RadioButtons}
          </RadioGroup>
        </FormControl>
        <Typography level="body-md">
          The initial survey consists of seven statements which you will react
          to using the buttons below each statement. Please answer each question
          carefully because the next steps of the task will depend on your
          previous answers. You may click anywhere on the option you like best
          to select it:
        </Typography>
        <FormControl
          sx={{
            display: "flex",
            justifyContent: "center",
            width: "100%",
            flexDirection: "row",
          }}
        >
          <FormLabel></FormLabel>
          <RadioGroup overlay orientation="horizontal" sx={{ gap: 2 }}>
            <Sheet
              component="label"
              // key='1'
              variant="soft"
              sx={{
                p: 2,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                boxShadow: "sm",
                borderRadius: "md",
              }}
            >
              <Typography level="body-sm" sx={{ mt: 1 }}>
                Example Button
              </Typography>
              <Radio
                value="1"
                variant="outlined"
                sx={{
                  my: 1,
                }}
              />
            </Sheet>
          </RadioGroup>
        </FormControl>
        <Typography level="body-md">
          After making a selection, you will automatically move to the next
          question.
        </Typography>
      </Stack>
    );
  } else if (step == 4) {
    tutorialStepUI = (
      <Stack gap={1}>
        <img src="/images/undraw_treasure_of-9-i.svg" />
        <Typography level="h2" textAlign="center">
          Bonus Payment
        </Typography>
        <Typography level="body-md">
          After you complete both Part 1 and Part 2 of this study, you are
          guaranteed a base payment of {formatMoney(totalBasePay)}. In addition,
          you will earn a bonus of {formatMoney(gameParams.bonus)} that you may
          keep or share with your partner.
        </Typography>
        <Typography level="h3" sx={{ pt: 2 }}>
          Default Bonus
        </Typography>
        <Typography level="body-md">
          You may choose to keep the default study bonus of{" "}
          {formatMoney(gameParams.bonus)}.
        </Typography>
        <Typography level="h3" sx={{ pt: 2 }}>
          Bonus Sharing (optional)
        </Typography>
        <Typography level="body-md">
          You may share up to {formatMoney(gameParams.maxBonusShare)} of your
          bonus with your partner.
          <br />
          They will receive {gameParams.shareMultiplier}x the amount you share.
          <br />
          For example, if you share {formatMoney(exampleShareAmt)} with your
          partner, your bonus will decrease by {formatMoney(exampleShareAmt)}{" "}
          and their bonus will increase by{" "}
          {formatMoney(exampleShareAmt * gameParams.shareMultiplier)}.
        </Typography>
        <FormControl sx={{ pt: 2 }}>
          <FormLabel>
            What is your final bonus if both you and your partner share $1.00
            with each other?
          </FormLabel>
          <RadioGroup
            name="q4"
            onChange={handleRadioButtonChange}
            defaultValue=""
          >
            {q4RadioButtons}
          </RadioGroup>
        </FormControl>
        <Alert
          variant="soft"
          color="danger"
          invertedColors
          startDecorator={<Warning />}
          sx={{
            alignItems: "flex-start",
            gap: "1rem",
            display: warningDisplay,
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography level="h3">Be warned!</Typography>
            <Typography level="body-md">
              If you choose to share your bonus but your partner does not, your
              final bonus payment will decrease.
              {lowBonusExplanation}
            </Typography>
            <Box
              sx={{
                mt: 2,
                display: "flex",
                justifyContent: "flex-end",
                gap: 1,
              }}
            >
              <Button variant="outlined" size="sm" onClick={handleWhy}>
                Why?
              </Button>
              <Button variant="solid" size="sm" onClick={handleFinishTutorial}>
                I understand, continue to the survey
              </Button>
            </Box>
          </Box>
        </Alert>
      </Stack>
    );
  }

  // UI
  return (
    <Container maxWidth="100vw" className="tutorial_container">
      <ProgressList
        items={[
          { name: "Tutorial", time: "~3 min" },
          { name: "Questionnaire", time: "~1 min" },
        ]}
        active={0}
      />

      <Stack
        sx={{
          maxWidth: {
            sm: "80vw",
            md: "40rem",
            lg: "40rem",
          },
          mx: "auto",
          mb: "2rem",
          py: 2,
        }}
        gap={1}
      >
        {tutorialStepUI}
        <Alert
          startDecorator={<WarningIcon />}
          variant="outlined"
          color="danger"
          sx={{ display: errorDisplay }}
        >
          Oops, that's not right. Please try again.
        </Alert>
        <Alert
          startDecorator={<Done />}
          variant="outlined"
          color="success"
          sx={{ display: q4SuccessDisplay }}
        >
          Exactly! {formatMoney(gameParams.bonus)} -{" "}
          {formatMoney(exampleShareAmt)} (the amount you shared) +{" "}
          {formatMoney(exampleShareAmt * gameParams.shareMultiplier)} (
          {gameParams.shareMultiplier}x what your partner shared).
        </Alert>
        <Box
          sx={{
            display: backNextDisplay,
            justifyContent: "center",
            width: "100%",
            flexDirection: "row",
          }}
        >
          <Button
            sx={{ my: 2, mr: 1 }}
            onClick={handleBack}
            disabled={backButtonDisabled}
          >
            Back
          </Button>
          <Button
            sx={{ my: 2, mr: 1 }}
            onClick={handleNext}
            disabled={nextButtonDisabled}
          >
            Next
          </Button>
        </Box>
      </Stack>
    </Container>
  );
}
