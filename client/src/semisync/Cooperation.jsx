/*
 * Filename: Cooperation.jsx
 * Author: Elijah Claggett
 *
 * Description:
 * This ReactJS file evaluates the level at which whether a participant will cooperate or defect from their partner(s).
 */

// Imports
import * as React from "react";
import {
  Button,
  Box,
  Container,
  Typography,
  Stack,
  FormControl,
  FormLabel,
  FormHelperText,
  Radio,
  RadioGroup,
} from "@mui/joy";
import { useState } from "react";
import {
  usePlayer,
  useGame,
  useStageTimer,
} from "@empirica/core/player/classic/react";
import { formatMoney, msToTime } from "../utils/formatting.js";

export default function Cooperate({ next }) {
  const player = usePlayer();
  const stageTimer = useStageTimer();
  const gameParams = player.get("gameParams");
  const game = useGame();
  const [currentValue, setCurrentValue] = useState("");
  let timeLeftTxt = "";
  if (stage.get("name") == "semi_asynchronous_steps") {
    timeLeft = stageTimer?.remaining ? stageTimer.remaining : 0;
    timeLeftTxt = (
      <span>
        {msToTime(timeLeft)} remaining to finish the survey.
        <br />
      </span>
    );
  } else {
    timeLeftTxt = (
      <span>{msToTime(stageTimer?.remaining ? stageTimer.remaining : 0)}</span>
    );
  }

  function handleRadioButtonChange(evt) {
    setCurrentValue(evt.target.value);
    setRadioButtonVals((radioButtonVals) => ({
      ...radioButtonVals,
      [evt.target.name]: evt.target.value,
    }));
  }

  function handleButtonClick(evt) {
    player.set("submitCooperationDecision", currentValue);
    game.set("submitCooperationDecision", {
      playerId: player.id,
      cooperationDecision: currentValue,
    });
    next();
  }

  return (
    <Container maxWidth="100vw">
      <Stack
        sx={{
          maxWidth: {
            md: "30rem",
          },
          mx: "auto",
          mt: "10rem",
        }}
        gap={1}
      >
        <Typography level="h2" textAlign="center">
          You're eligible for a bonus!
        </Typography>
        <Typography level="body-md" textAlign="center">
          Please select an option below.{" "}
          {msToTime(stageTimer?.remaining ? stageTimer.remaining : 0)}{" "}
          remaining.
        </Typography>
        <RadioGroup
          overlay
          name="q1"
          value={currentValue}
          onChange={handleRadioButtonChange}
        >
          <FormControl sx={{ p: 0, flexDirection: "row", gap: 2, mt: 4 }}>
            <Radio value="1" />
            <div>
              <FormLabel>
                Award yourself a {formatMoney(gameParams.defectionBonus)} bonus.
              </FormLabel>
            </div>
          </FormControl>
          <FormControl sx={{ p: 0, flexDirection: "row", gap: 2 }}>
            <Radio value="2" />
            <div>
              <FormLabel>
                Award you and your partner a{" "}
                {formatMoney(gameParams.cooperationBonus)} bonus.
              </FormLabel>
              <FormHelperText>
                If you select this but your partner does not, you will receive
                no bonus.
              </FormHelperText>
            </div>
          </FormControl>
        </RadioGroup>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            width: "100%",
            flexDirection: "row",
          }}
        >
          <Button sx={{ my: 2 }} onClick={handleButtonClick}>
            Continue
          </Button>
        </Box>
      </Stack>
    </Container>
  );
}
