/*
 * Filename: PreEvaluation.jsx
 * Author: Elijah Claggett
 *
 * Description:
 * This ReactJS file displays a chat window for participants to communicate with a bot before the main experiment.
 */
import * as React from 'react';
import { Button, Box, Container, Typography, Stack, FormControl, FormLabel, FormHelperText, Radio, RadioGroup } from '@mui/joy';
import { useState, useEffect } from 'react';
import { usePlayer, useGame, useStageTimer } from "@empirica/core/player/classic/react";
import { formatMoney, msToTime } from '../utils/formatting.js';
import ProgressList from '../components/ProgressList.jsx';
// import "react-chat-elements/dist/main.css";
// import { MessageBox } from "react-chat-elements";

// import styles from '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
import '../chat.scss';
import { MainContainer, ChatContainer, MessageList, Message, MessageInput, TypingIndicator } from '@chatscope/chat-ui-kit-react';
import { State } from '@empirica/tajriba';
import { GasMeterOutlined } from '@mui/icons-material';

// import { Chat } from "@empirica/chat";

export default function PreEvaluation({next}) {

    const player = usePlayer();
    const playerId = player.id;
    const finishPreEval = player.get('finishPreEval') || false;
    if (finishPreEval) {
        next();
    }
    const gameParams = player.get('gameParams');
    const game = useGame();
    const stageTimer = useStageTimer();
    const preEvalChannel = 'p-'+player.id;

    const [step, setStep] = useState(1);
    const [radioButtonVals, setRadioButtonVals] = useState();
    const [preventClick, setPreventClick] = useState(false);
    const [currentValue, setCurrentValue] = useState('');
    const [isTyping, setIsTyping] = React.useState(false);
    const [typingIndicator, setTypingIndicator] = React.useState(null);
    // const [debouncedIsTyping, setDebouncedIsTyping] = React.useState(false);


    const preEvalStarted = player.get('startPreEval') || false;
    if (!preEvalStarted) {
        player.set('startPreEval', true);
    }
    

    // Empirica message state
    let messages = player.get('preEvalMessages') || [];


    const [msgsUI, setMsgsUI] = useState([]);
    let msgKey = 'm';
    let msgIdx = 0;
    let msgCount = 0;

    useEffect(() => {
        if (typeof(messages) == 'object' && 'length' in messages) {
            const uiElems = [];

            let firstFromSender = true;
            let lastSender = -1;

            for (const msg of messages) {
                
                firstFromSender = lastSender != msg.sender;
                lastSender = msg.sender

                uiElems.push(<Message model={{
                    message: msg.txt,
                    sentTime: "just now",
                    sender: 'p'+msg.sender,
                    direction: msg.sender == playerId ? 'outgoing' : 'incoming',
                    position: 'single'
                    }} key={msgKey + msgIdx}><Message.Header sender={msg.sender == playerId ? 'You' : 'Bot'} /> </Message>);
                msgIdx++;
            }
            let newMsgCount = msgIdx;
            if (newMsgCount > msgCount) {
                msgCount = newMsgCount;
                setMsgsUI(uiElems);
            }
        }
    }, [messages]);

    
    function handleSend(txt) {
        player.set('preEvalMessages', [...messages, {
            sender: playerId,
            sentTime: 'just now',
            txt: txt
        }]);
        player.set('sendPreEvalMsg', txt);
    }

    function handleChange(evt) {
    }

    function handleButtonClick(evt) {
        const preEvalStarted = player.get('startPreEval') || false;
        if (preEvalStarted) {
            next();
        } else {
            player.set('startPreEval', true);
        }
        
    }
    const skipNextUI = window.location.hostname == 'localhost' ? <Button onClick={() => next()}>(Development Only) Skip</Button> : '';
    const remainingText = stageTimer?.remaining ? msToTime(stageTimer.remaining) : '';
    return (
        <Container maxWidth="100vw">

            <ProgressList items={[
                {name: 'Tutorial', time: '~3 min'},
                // {name: 'Practice Session', time: '~5 min'},
                {name: 'Questionnaire', time: '~1 min'},
                ]} active={1} />


            <Stack sx={{
                maxWidth: {
                    sm: '30rem',
                    md: '30rem'
                },
                mx: 'auto',
                // mt: '10rem',
            }} gap={1} >
                <Typography level="h2" textAlign="center">
                    Practice Session
                </Typography>
                <Typography level="body-md" textAlign="center">
                    Please have a warm up conversation with a bot partner. Once you have a sufficiently long conversation, you will automatically move to the next step.
                </Typography>
                <Typography level="body-md" textAlign="center">{remainingText}</Typography>
                <MainContainer>
                    <ChatContainer style={{height: '25rem'}}>       
                        <MessageList>
                            {msgsUI}
                        </MessageList>
                        <MessageInput placeholder="Type message here" onSend={handleSend} onChange={handleChange} attachButton={null}/>        
                    </ChatContainer>
                </MainContainer>
                {/* <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', flexDirection: 'row'}}>
                    <Button sx={{ my: 2 }} onClick={handleButtonClick}>Continue</Button>
                </Box> */}
            </Stack>

            {skipNextUI}
            
        </Container>
        );
    }