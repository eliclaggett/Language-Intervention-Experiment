/*
 * Filename: ConsentForm.jsx
 * Author: Elijah Claggett
 *
 * Description:
 * This ReactJS file is consent form displayed during the experiment's onboarding process.
 */
import * as React from 'react';
import { Alert, Button, Card, Container, FormControl, FormLabel, Radio, RadioGroup, Typography, Stack } from '@mui/joy';
import WarningIcon from '@mui/icons-material/Warning';
import { usePlayer } from "@empirica/core/player/classic/react";
import { useState } from 'react';
import { formatMoney } from '../utils/formatting';
import ProgressList from '../components/ProgressList';

export default function ConsentForm({ next }) {

    const player = usePlayer();
    const gameParams = player.get('gameParams');
    if (!gameParams) window.location.reload();

    // Logic to handle interactions with this page
    const [radioButtonVals, setRadioButtonVals] = useState();

    const handleRadioButtonChange = (evt) => {
        setRadioButtonVals(radioButtonVals => ({
            ...radioButtonVals,
            [evt.target.name]: evt.target.value
        }));
    }

    function handleButtonClick() {
        player.set('submitConsentForm', radioButtonVals);
    }

    // Logic to move to next step or stop the experiment
    let nonconsentForm = '';
    const passedConsentForm = player.get('passedConsentForm');

    if (passedConsentForm === false) {
        nonconsentForm = <Alert
                        startDecorator={<WarningIcon />}
                        variant="outlined"
                        color="danger"
                    >
                        We cannot continue without your consent. Please return the study if these terms cannot be met.
                    </Alert>;
    }
    else if (passedConsentForm === true) {
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
                py: 2
            }} gap={1} >
                <Typography level="h1">
                    Consent Form (STUDY2021_00000280)
                </Typography>
                <strong>
                    Please read the following information. When you give your consent, you
                    can proceed to the task. In this consent form, we refer to the current study as a Human Intelligence Task (HIT).
                </strong>
                <Card variant="soft" sx={{ maxHeight: '30em', overflow: 'scroll', p: 4, my: 2 }}>
                    <p>
                        This game is part of a research study conducted by Carnegie Mellon
                        University and is funded by the National Science Foundation.
                    </p>
                    <strong>Purpose</strong>
                    <p>
                        The purpose of the research is to examine how people communicate and
                        cooperate with others.
                    </p>
                    <strong>Procedures</strong>
                    <p>
                        You will be expected to work on this task with other players. This task
                        consists of two stages. In the first stage, you will be expected to
                        communicate with one or more other players regarding assessments on
                        real-world topics. In the second stage, you will be expected to play a
                        decision-making game with the same counterparts.
                    </p>
                    <p>
                        Tutorial: before the task, you will complete a tutorial on how to do the
                        task. After the tutorial, you will be asked a few questions about your
                        understanding of the game. If you do not answer the questions correctly,
                        you will still receive the base pay of {formatMoney(gameParams.task1Pay)}, but you
                        are not eligible to join the task and the HIT again.
                    </p>
                    <p>
                        For those participants who are eligible to participate in the actual
                        game (due to answering the tutorial questions correctly), we may inform
                        you that we cannot use you for the game at that moment either because A)
                        we have more people than we need for a group at that time, or B) there
                        are not enough eligible participants to form a group at that time, so
                        the game will not happen then. Participants in both A and B will be paid
                        the base pay (as mentioned above) and may accept the HIT again in the
                        future.
                    </p>
                    <p>
                        Whether you fail the comprehension test or are not found a match, your
                        non-participation in the actual game will not result in a negative
                        rating on Prolific.
                    </p>
                    <strong>Participant requirements</strong>
                    <p>
                        Participation in this study is limited to individuals age 18 and older.
                        Only those located in the US at the time of their participation are
                        allowed to participate in this study.
                    </p>
                    <strong>Risks</strong>
                    <p>
                        We prohibit participants to send unkind or inappropriate messages during
                        this task. When you send such messages, we will report your violation to
                        Prolific. Although we conduct a careful
                        screening process, you might receive unkind or inappropriate messages
                        from another participant.
                    </p>
                    <strong>Benefits</strong>
                    <p>
                        You may learn about how to communicate with others. Also, the knowledge
                        received may be useful to others and to the scientific community by
                        clarifying how people communicate and cooperate with each other.
                    </p>
                    <strong>Compensation & Costs</strong>
                    <p>
                        You will be compensated the base pay of {formatMoney(gameParams.task1Pay)} for
                        beginning the study and completing the initial tutorial section. If you
                        are deemed eligible to participate in the actual game (by answering the
                        tutorial questions correctly), and you complete the game, you will also
                        receive a completion bonus of {formatMoney(gameParams.task2Pay)}. In
                        addition, those who participate in the game may earn a bonus up to
                        {formatMoney(gameParams.maxBonus)} in a performance bonus based on the
                        decisions they make while playing the game.
                    </p>
                    <p>There will be no cost to you if you participate in this study.</p>
                    <strong>Confidentiality</strong>
                    <p>
                        The data captured for the research does not include any personally
                        identifiable information about you. The sponsor of this research, the
                        National Science Foundation, may have access to the research record. The
                        study will utilize Prolific to conduct this
                        research. These companies are not owned by CMU. The companies will have
                        access to the research data that you produce and any identifiable
                        information that you share with the company while using its product.
                        Please note that Carnegie Mellon does not control the Terms and
                        Conditions of the company or how they will use any information that they
                        collect.
                    </p>
                    <strong>Future use of information</strong>
                    <p>
                        We may use the anonymous data for our future research studies, or we may
                        distribute the data to other researchers for their research studies. We
                        would do this without getting additional informed consent from you (or
                        your legally authorized representative). Sharing of data with other
                        researchers will only be done in such a manner that you will not be
                        identified.
                    </p>
                    <strong>Right to ask questions & Contact Information</strong>
                    <p>
                        If you have any questions about this study, you should feel free to ask
                        them by contacting the Principal Investigator now at Hirokazu Shirado
                        (shirado@cmu.edu). If you have questions later, desire additional
                        information, or wish to withdraw your participation please contact the
                        Principal Investigator by e-mail in accordance with the contact
                        information listed above.
                    </p>
                    <p>
                        If you have questions pertaining to your rights as a research
                        participant; or to report concerns to this study, you should contact the
                        Office of Research integrity and Compliance at Carnegie Mellon
                        University. Email: irb-review@andrew.cmu.edu. Phone: 412-268-4721.
                    </p>
                    <strong>Voluntary participation</strong>
                    <p>
                        Your participation in this research is voluntary. You may discontinue
                        participation at any time during the research activity. You may print a
                        copy of this consent form for your records.
                    </p>
                </Card>
                <FormControl>
                    <FormLabel>I am age 18 or older.</FormLabel>
                    <RadioGroup name="q1" onChange={handleRadioButtonChange}>
                        <Radio value="yes" label="Yes" variant="outlined" />
                        <Radio value="no" label="No" variant="outlined" />
                    </RadioGroup>
                </FormControl>
                <FormControl>
                    <FormLabel>I have read and understand the information above.</FormLabel>
                    <RadioGroup name="q2" onChange={handleRadioButtonChange}>
                        <Radio value="yes" label="Yes" variant="outlined" />
                        <Radio value="no" label="No" variant="outlined" />
                    </RadioGroup>
                </FormControl>
                <FormControl>
                    <FormLabel>I have reviewed the eligibility requirements listed in the Participant Requirements section of this consent form and certify that I am eligible to participate in this research, to the best of my knowledge.</FormLabel>
                    <RadioGroup name="q3" onChange={handleRadioButtonChange}>
                        <Radio value="yes" label="Yes" variant="outlined" />
                        <Radio value="no" label="No" variant="outlined" />
                    </RadioGroup>
                </FormControl>
                <FormControl>
                    <FormLabel>I want to participate in this research and continue with the game.</FormLabel>
                    <RadioGroup name="q4" onChange={handleRadioButtonChange}>
                        <Radio value="yes" label="Yes" variant="outlined" />
                        <Radio value="no" label="No" variant="outlined" />
                    </RadioGroup>
                </FormControl>
                {nonconsentForm}
                <Button sx={{ my: 2 }} onClick={handleButtonClick}>Continue</Button>
            </Stack>
        </Container>
    );
}