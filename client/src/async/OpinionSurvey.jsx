/*
 * Filename: OpinionSurvey.jsx
 * Author: Elijah Claggett
 *
 * Description:
 * This ReactJS file displays a survey of participant opinions toward various controversial topics.
 */
import * as React from 'react';
import { Container, Typography, Stack } from '@mui/joy';
import LikertQuestion from '../components/LikertQuestion.jsx';
import { useState } from 'react';
import { usePlayer, useGame } from "@empirica/core/player/classic/react";
import ProgressList from '../components/ProgressList.jsx';

export default function OpinionSurvey({next}) {

    const player = usePlayer();
    if (!player) window.location.reload();
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

        setTimeout(() => {
            setCurrentValue('');
            if (step < maxSteps) {
                setPrompt(surveyQuestions[step]);
                setStep(step+1);
            } else {
                player.set('submitOpinionSurvey', radioButtonVals);
                next();
            }
        }, 50);
    }

    return (
        <Container maxWidth="100vw">
            <ProgressList items={[
                {name: 'Tutorial', time: '~3 min'},
                // {name: 'Practice Session', time: '~5 min'},
                {name: 'Questionnaire', time: '~1 min'},
                ]} active={1} />

            <Stack sx={{
                maxWidth: {
                    md: '90rem'
                },
                mx: 'auto',
                mt: '10rem',
                textAlign: 'center'
            }} gap={1} >
                <Typography level="h2">
                How do you feel about this statement? ({step} / {maxSteps})
                </Typography>
                <LikertQuestion name={'q'+step} prompt={prompt} onChange={handleRadioButtonChange} value={currentValue} disabled={preventClick}/>
            </Stack>
        </Container>
        );
    }