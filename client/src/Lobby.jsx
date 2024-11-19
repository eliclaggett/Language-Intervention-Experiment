/*
 * Filename: Lobby.jsx
 * Author: Elijah Claggett
 *
 * Description:
 * This ReactJS file is the waiting room displayed while we wait for all participants to finish onboarding.
 * Participants can use this time to become acquainted with pairing methodology and the features of the chat.
 */

// Imports
import * as React from "react";
import { Button, Container, Typography, Stack } from "@mui/joy";
import { useEffect, useState } from "react";
import { usePlayer, useGame } from "@empirica/core/player/classic/react";
import { msToTime } from "./utils/formatting";
import TaskInstructions from "./components/TaskInstructions.jsx";

export default function Lobby() {
  // Useful variables
  const player = usePlayer();
  const game = useGame();
  let lobbyTimeout = game.get("lobbyTimeout") || false;

  // State variables
  const now = new Date();
  const [timeRemaining, setTimeRemaining] = useState(
    "Wait time is being calculated"
  );
  const [taskInstructionDisplay, setTaskInstructionDisplay] = useState("none");
  const [lobbyDisplay, setLobbyDisplay] = useState("block");
  const readInstructions = player.get("readChatFeatures") || false;
  const [buttonDisplay, setButtonDisplay] = useState("flex");

  // Run on component load
  useEffect(() => {
    // Start a timer that we can show in the UI
    if (!lobbyTimeout) {
      game.set("startLobby", true);
      lobbyTimeout =
        Date.now() + parseInt(game.get("lobbyDuration")) / 1000 / 1000;
    } else {
      lobbyTimeout = new Date(lobbyTimeout);
    }

    // Poll the timer
    const interval = setInterval(() => {
      const now = new Date();
      const diffMS = lobbyTimeout - now;

      setTimeRemaining(msToTime(diffMS));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Helper function to allow participants to read instructions early
  function showTaskInstructions() {
    setTaskInstructionDisplay("block");
    setLobbyDisplay("none");
    setButtonDisplay("none");
  }

  // UI
  return (
    <Container maxWidth="100vw">
      <Stack
        sx={{
          maxWidth: {
            md: "30rem",
          },
          mx: "auto",
          mt: "10rem",
          textAlign: "center",
        }}
        gap={1}
      >
        <div style={{ display: readInstructions ? "block" : lobbyDisplay }}>
          <Typography level="h1" sx={{ pt: 12 }}>
            Almost there!
            <br />
            Prepare for the next task
          </Typography>
          <Typography level="body-md" textAlign="left">
            We are waiting for all participants to finish onboarding. Then, you
            will be assigned a partner and enter a chatroom with them.
          </Typography>
        </div>
        <Button
          variant="outlined"
          onClick={showTaskInstructions}
          style={{ display: readInstructions ? "none" : buttonDisplay }}
        >
          Read Task Instructions
        </Button>

        <Typography level="body-md" color="primary">
          {timeRemaining} wait time remaining...
        </Typography>
        <div
          style={{
            display: readInstructions ? "none" : taskInstructionDisplay,
          }}
        >
          <TaskInstructions />
        </div>
      </Stack>
    </Container>
  );
}
