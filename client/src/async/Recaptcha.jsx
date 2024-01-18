/*
 * Filename: Recaptcha.jsx
 * Author: Elijah Claggett
 *
 * Description:
 * This ReactJS file is reCAPTCHA step of the experiment's onboarding process.
 */
import * as React from 'react';
import { Container, Typography, Stack } from '@mui/joy';
import ReCAPTCHA from "react-google-recaptcha";
import { usePlayer } from "@empirica/core/player/classic/react";

export default function Recaptcha({ next }) {

    const player = usePlayer();
    const gameParams = player.get('gameParams');
    const reCaptchaSiteKey = window.location.hostname == 'localhost' ?
        '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI' :
        '6LcJ3hknAAAAANlF8Wp0Uh9RLrsyDSTjZyehZdrM';

    // Logic to handle interactions with this page
    function onChange(value) {
        player.set('submitRecaptcha', { data: value });
    }

    // Logic to move to next step or stop the experiment
    if (player.get('passedRecaptcha') === true) {
        next();
    }
    
    // UI
    return (
        <Container maxWidth="100vw">
            <Stack sx={{
                maxWidth: {
                    md: '30rem'
                },
                mx: 'auto',
                mt: '10vh',
                textAlign: 'center'
            }} gap={1} >
                <img src="images/undraw_chatting_re_j55r.svg" id="headerImg_recaptcha" />
                <Typography level="h1">
                    Welcome to the CMU<br />Conversations Study
                </Typography>
                <Typography level="body-sm">
                    Version: {gameParams?.version ? gameParams.version : ''}
                </Typography>
                <Typography level="body-md">
                    Ready to chat? Complete the CAPTCHA to start the first task.
                </Typography>
                <ReCAPTCHA
                    sitekey={reCaptchaSiteKey}
                    onChange={onChange}
                    id="recaptcha_dialog"
                />
            </Stack>
        </Container>
    );
}