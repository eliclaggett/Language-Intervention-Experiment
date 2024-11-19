/*
 * Filename: Problem.jsx
 * Author: Elijah Claggett
 *
 * Description:
 * This ReactJS file displays the ending screen for error states of the experiment.
 */

// Imports
import * as React from "react";
import { Button, Box, Container, Typography, Stack } from "@mui/joy";

export default function Problem({ next }) {
  function handleButtonClick(evt) {
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
          Oops! There was a problem.
        </Typography>
        <Typography level="body-md" textAlign="center">
          Your earnings for this study cannot be calculated yet.
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
