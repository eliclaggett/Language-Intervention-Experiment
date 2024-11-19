/*
 * Filename: LikertQuestion.jsx
 * Author: Elijah Claggett
 *
 * Description:
 * This ReactJS component is a 7-point likert-style radio button input element.
 */

// Imports
import React from "react";
import { FormControl, FormLabel, RadioGroup } from "@mui/joy";
import ImageRadioButton from "./ImageRadioButton.jsx";

export default function IOSQuestion({
  onChange = null,
  value = null,
  type = "partner",
}) {
  const typeTxt = type == "partner" ? " Partner" : " AI";
  return (
    <FormControl>
      <FormLabel></FormLabel>
      <RadioGroup
        overlay
        name={name}
        value={value}
        orientation="horizontal"
        sx={{
          display: "flex",
          flexDirection: "row",
          mx: "auto",
          flexWrap: "wrap",
          gap: 2,
          justifyContent: "center",
        }}
        onChange={onChange}
      >
        <ImageRadioButton src={"/images/IOS 1" + typeTxt + ".svg"} value="0" />
        <ImageRadioButton src={"/images/IOS 2" + typeTxt + ".svg"} value="1" />
        <ImageRadioButton src={"/images/IOS 3" + typeTxt + ".svg"} value="2" />
        <ImageRadioButton src={"/images/IOS 4" + typeTxt + ".svg"} value="3" />
        <ImageRadioButton src={"/images/IOS 5" + typeTxt + ".svg"} value="4" />
        <ImageRadioButton src={"/images/IOS 6" + typeTxt + ".svg"} value="5" />
        <ImageRadioButton src={"/images/IOS 7" + typeTxt + ".svg"} value="6" />
      </RadioGroup>
    </FormControl>
  );
}
