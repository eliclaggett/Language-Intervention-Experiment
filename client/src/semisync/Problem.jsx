/*
 * Filename: Problem.jsx
 * Author: Elijah Claggett
 *
 * Description:
 * This ReactJS file displays the ending screen for error states of the experiment.
 */
import * as React from 'react';
import { Button, Box, Container, Typography, Stack, FormControl, FormLabel, FormHelperText, Radio, RadioGroup } from '@mui/joy';
import { useState } from 'react';
import { usePlayer, useGame } from "@empirica/core/player/classic/react";
import { formatMoney } from '../utils/formatting.js';

export default function Problem({next}) {

    const player = usePlayer();
    const gameParams = player.get('gameParams');
    const game = useGame();
    const [step, setStep] = useState(1);
    const [radioButtonVals, setRadioButtonVals] = useState();
    const [preventClick, setPreventClick] = useState(false);
    const [currentValue, setCurrentValue] = useState('');
    const surveyQuestions = [
        "I would want my kids to be taught evolution as a fact of biology",
        "My second amendment right to bear arms should be protected",
        "I support funding the military",
        "Our children are being indoctrinated at school with LGBT messaging",
        "I would pay higher taxes to support climate change research",
        "Restrictions to stop the spread of COVID-19 went too far",
        "I want stricter immigration requirements into the U.S."
    ]
    const [prompt, setPrompt] = useState(surveyQuestions[0]);
    const maxSteps = surveyQuestions.length;

    function handleRadioButtonChange(evt) {
        setCurrentValue(evt.target.value);
        setRadioButtonVals(radioButtonVals => ({
            ...radioButtonVals,
            [evt.target.name]: evt.target.value
        }));
    }

    function handleButtonClick(evt) {
        next();
    }

    return (
        <Container maxWidth="100vw">
            <Stack sx={{
                maxWidth: {
                    md: '30rem'
                },
                mx: 'auto',
                mt: '10rem',
            }} gap={1} >
                <Typography level="h2" textAlign="center">
                Oops! There was a problem.
                </Typography>
                <Typography level="body-md" textAlign="center">Your earnings for this study cannot be calculated yet.</Typography>
                
                <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', flexDirection: 'row'}}>
                    <Button sx={{ my: 2 }} onClick={handleButtonClick}>Continue</Button>
                </Box>
            </Stack>
            
        </Container>
        );
    }