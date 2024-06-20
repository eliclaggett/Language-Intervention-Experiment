/*
 * Filename: ImageRadioButton.jsx
 * Author: Elijah Claggett
 *
 * Description:
 * This ReactJS component wraps a radio button in a larger button for easier selection.
 */
import React from "react";
import { Sheet, Radio } from "@mui/joy";

export default function ImageRadioButton({
  src="",
  value=""
}) {
  return (
    <Sheet
    component="label"
    variant="plain"
    sx={{
    p: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 'md',
    flex: '1',
    flexGrow: 0,
    mx: '0.25rem',
    textAlign: 'center',
    minWidth: '10em',
    background: 'none',
    boxShadow: 'none'
    }}
>
    <img src={src} style={{height:"5em"}}/>
    <Radio
    value={value}
    variant="outlined"
    sx={{
        my: 1,
    }}
    />
</Sheet>
  );
}


