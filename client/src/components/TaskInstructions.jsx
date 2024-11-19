/*
 * Filename: TaskInstructions.jsx
 * Author: Elijah Claggett
 *
 * Description:
 * This ReactJS component provides instructions for the main task of the experiment
 */

// Imports
import React from "react";
import { Button, Container, IconButton, Typography, Stack } from "@mui/joy";
import { usePlayer, useGame } from "@empirica/core/player/classic/react";
import { QuestionAnswerOutlined, SendRounded } from "@mui/icons-material";

export default function TaskInstructions({
  value = "",
  label = "",
  disabled = false,
}) {
  const player = usePlayer();
  const game = useGame();
  const gameParams = game.get("gameParams");

  const { experimentCondition, _ } = game.get("treatment");

  let treatmentDescription = "";

  function handleClick() {
    player.set("readChatFeatures", true);
  }

  if (experimentCondition == "treatment") {
    treatmentDescription = (
      <div>
        <Typography level="h3" textAlign="" sx={{ pt: 6, pb: 1 }}>
          1) AI Suggestions
        </Typography>
        <Typography level="body-md">
          If you are having trouble wording a message or continuing the
          conversation, we occasionally provide AI suggestions that you can use
          to keep the conversation going. This is how they will appear:
        </Typography>

        <div
          className="msgSend treatment example"
          style={{ maxWidth: "30rem", marginLeft: "auto", marginRight: "auto" }}
        >
          <span>Suggestion (click to copy)</span>
          <div className="input-wrapper">
            <div>Example suggested message</div>
          </div>
          <IconButton variant="plain">
            <SendRounded />
          </IconButton>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Stack
        sx={{
          maxWidth: {
            md: "30rem",
          },
          mx: "auto",
          textAlign: "left",
        }}
      >
        <Typography level="h2" textAlign="center" sx={{ pb: 2 }}>
          Communication Task
        </Typography>
        <Typography level="body-md">
          You will be provided {gameParams.chatTime} minutes to discuss an
          assigned topic with your partner. Remember that your goal is to
          adequately communicate your stance towards the topic and provide an
          argument supporting your views. You and your partner will evaluate
          each other's arguments. We will then aggregate and analyze the
          arguments of all participants who have similar viewpoints. You must
          send multiple messages to be paid for your participation.
          <br />
          <br />
          We provide the following features to help you out:
        </Typography>
        {treatmentDescription}
        <Typography level="h3" textAlign="" sx={{ pt: 6, pb: 1 }}>
          2) Early Finish
        </Typography>
        <Typography level="body-md">
          We understand that some people type faster than others.
          <br />
          <strong>
            If you and your partner exchange at least{" "}
            {gameParams.numMsgsFinishEarly} messages, you may finish the task
            early and still receive the full payment for the study.
          </strong>
        </Typography>
        <Container
          sx={{
            textAlign: "center",
            fontSize: 16,
            fontWeight: "bold",
            transform: "scale(2)",
            pt: 3,
          }}
        >
          <QuestionAnswerOutlined /> x{gameParams.numMsgsFinishEarly}
        </Container>
        <Typography level="h3" textAlign="" sx={{ pt: 8, pb: 1 }}>
          3) Safety
        </Typography>
        <Typography level="body-md">
          In the event that your partner uses violent, obscene, or otherwise
          unacceptable language, please press the button below the chat window
          to report their behavior and end the chat. Then, we will ask you and
          your partner to return the study to receive prorated compensation for
          your time.
        </Typography>
        <Button sx={{ mt: 4, mb: 12 }} onClick={handleClick}>
          Continue
        </Button>
      </Stack>
    </div>
  );
}
