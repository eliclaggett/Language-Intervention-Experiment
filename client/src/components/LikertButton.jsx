/*
 * Filename: OpinionSurvey.jsx
 * Author: Elijah Claggett
 *
 * Description:
 * This ReactJS component wraps a radio button in a larger button for easier selection.
 */
import React from "react";
import { Sheet, Radio, Typography } from "@mui/joy";

export default function LikertButton({
  value="",
  label="",
  disabled=false
}) {
  return (
            <Sheet
                component="label"
                variant="soft"
                sx={{
                p: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: 'sm',
                borderRadius: 'md',
                flex: '1',
                mx: '0.25rem',
                textAlign: 'center'
                }}
            >
                <Typography level="body-sm" sx={{ mt: 1 }}>
                {label}
                </Typography>
                <Radio
                value={value}
                variant="outlined"
                sx={{
                    my: 1,
                }}
                disabled={disabled}
                />
            </Sheet>
  );
}


