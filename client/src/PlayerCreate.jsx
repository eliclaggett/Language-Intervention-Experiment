/*
 * Filename: PlayerCreate.jsx
 * Author: Elijah Claggett (modified from auto-generated Empirica file)
 *
 * Description:
 * This ReactJS file displays the initial page of the experiment where we get an identifier for each participant
 */

// Imports
import React, { useState, useEffect } from "react";
import {
  Button,
  FormControl,
  FormLabel,
  Input,
  Container,
  Typography,
  Stack
} from "@mui/joy";

export function PlayerCreate({ onPlayerID, connecting }) {
  // For the text input field.
  const [playerID, setPlayerID] = useState("");

  // Useful variables
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  const prolificIdFromURL = urlParams.get("PROLIFIC_PID");

  useEffect(() => {
    if (prolificIdFromURL) {
      onPlayerID(prolificIdFromURL);
    }
  }, []);

  // Handling the player submitting their ID.
  const handleSubmit = (evt) => {
    evt.preventDefault();
    if (!playerID || playerID.trim() === "") {
      return;
    }

    onPlayerID(playerID);
  };

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
        {/* <img src="images/undraw_chatting_re_j55r.svg" id="headerImg_recaptcha" /> */}
        <Typography level="h1">Getting your Prolific ID...</Typography>
        <Typography level="body-md">
          Taking too long? Enter your Prolific ID manually below.
        </Typography>

        <form onSubmit={handleSubmit}>
          <FormControl>
            <FormLabel>Prolific ID</FormLabel>
            <Input
              placeholder="Type in here…"
              value={playerID}
              onChange={(e) => setPlayerID(e.target.value)}
            />
          </FormControl>
        </form>

        <Button
          color="primary"
          sx={{
            flex: 0,
            width: "10rem",
            mx: "auto",
            mb: "2rem",
          }}
          onClick={handleSubmit}
        >
          Submit
        </Button>
      </Stack>
    </Container>
  );
}
