/*
 * Filename: ChatEndAcknowledgement.jsx
 * Author: Elijah Claggett
 *
 * Description:
 * This ReactJS file confirms that a participant is still attentive after the chat is over
 */

// Imports
import React, { useEffect } from "react";
import { Button, Box, Container, Typography, Stack } from "@mui/joy";
import { usePlayer } from "@empirica/core/player/classic/react";

export default function ChatEndAcknowledgement({ next }) {
  const player = usePlayer();
  const chatEnded = player.get("serverChatEnded");

  useEffect(() => {
    if (!chatEnded) {
      player.set("serverChatEnded", true);
    }
  }, []);
  function handleButtonClick(evt) {
    player.set("passedChat", true);
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
          Chat Finished!
        </Typography>
        <Typography level="body-md" textAlign="center">
          Please continue to the final step of this study and describe your
          understanding of your partner.
        </Typography>
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
