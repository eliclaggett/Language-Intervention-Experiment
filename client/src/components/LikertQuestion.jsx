/*
 * Filename: LikertQuestion.jsx
 * Author: Elijah Claggett
 *
 * Description:
 * This ReactJS component is a 7-point likert-style radio button input element.
 */
import React from "react";
import { FormControl, FormLabel, Typography, RadioGroup } from '@mui/joy';
import LikertButton from "./LikertButton.jsx";

export default function LikertQuestion({
    prompt = "",
    name = "",
    onChange = null,
    disabled = false,
    value = "",
    type="agreement"
}) {

    if (type == 'difficulty') {
        return (<div>
            <FormControl>
                <FormLabel></FormLabel>
                <RadioGroup
                    overlay
                    name={name}
                    value={value}
                    orientation="horizontal"
                    sx={{ display: 'flex', flexDirection: 'row', mx: 'auto' }}
                    onChange={onChange}
                >
                    <LikertButton label="Very difficult" value="0" disabled={disabled} />
                    <LikertButton label="Difficult" value="1" disabled={disabled} />
                    <LikertButton label="Slightly difficult" value="2" disabled={disabled} />
                    <LikertButton label="Neither" value="3" disabled={disabled} />
                    <LikertButton label="Slightly easy" value="4" disabled={disabled} />
                    <LikertButton label="Easy" value="5" disabled={disabled} />
                    <LikertButton label="Very easy" value="6" disabled={disabled} />
                </RadioGroup>
            </FormControl>
        </div>);
    }
    return (
        <div>
            <Typography level="h3">{prompt}</Typography>
            <FormControl>
                <FormLabel></FormLabel>
                <RadioGroup
                    overlay
                    name={name}
                    value={value}
                    orientation="horizontal"
                    sx={{ display: 'flex', flexDirection: 'row', mx: 'auto' }}
                    onChange={onChange}
                >
                    <LikertButton label="Strongly disagree" value="0" disabled={disabled} />
                    <LikertButton label="Disagree" value="1" disabled={disabled} />
                    <LikertButton label="Slightly disagree" value="2" disabled={disabled} />
                    <LikertButton label="Neutral" value="3" disabled={disabled} />
                    <LikertButton label="Slightly agree" value="4" disabled={disabled} />
                    <LikertButton label="Agree" value="5" disabled={disabled} />
                    <LikertButton label="Strongly agree" value="6" disabled={disabled} />
                </RadioGroup>
            </FormControl>
        </div>
    );
}
