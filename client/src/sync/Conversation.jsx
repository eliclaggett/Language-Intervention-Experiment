/*
 * Filename: Conversation.jsx
 * Author: Elijah Claggett
 *
 * Description:
 * This ReactJS file displays a chat window for participants to discuss with each other about assigned topics.
 */
import React,{ useState, useEffect, useRef } from 'react';
import { Button, Box, Container, IconButton, Typography, Stack, FormControl, FormLabel, FormHelperText, Radio, RadioGroup } from '@mui/joy';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import { PlaylistRemoveTwoTone, SmartToyOutlined } from '@mui/icons-material';
import { usePlayer, useGame, useStageTimer } from "@empirica/core/player/classic/react";
import { formatMoney, msToTime } from '../utils/formatting.js';

// import "react-chat-elements/dist/main.css";
// import { MessageBox } from "react-chat-elements";

// import styles from '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
import '../chat.scss';
import { Avatar, MainContainer, ChatContainer, MessageList, Message, MessageInput, TypingIndicator } from '@chatscope/chat-ui-kit-react';
import { State } from '@empirica/tajriba';

import { Hint } from 'react-autocomplete-hint';
// import * as Test from '../utils/react-autocomplete-hint/dist/src/index.js';

// import { Chat } from "@empirica/chat";


// TODO: Remove next?
export default function Conversation({next}) {

    const player = usePlayer();
    const playerId = player.get('id');
    const gameParams = player.get('gameParams');
    const playerGroup = player.get('group');
    const partnerGroup = player.get('partnerGroup');
    const acknowledgedGroup = player.get('acknowledgeGroup') || false;
    const game = useGame();
    const stageTimer = useStageTimer();

    const [step, setStep] = useState(1);
    const [text, setText] = useState('');
    const [autocompleteOptions, setAutocompleteOptions] = useState([]);
    const [radioButtonVals, setRadioButtonVals] = useState();
    const [preventClick, setPreventClick] = useState(false);
    const [currentValue, setCurrentValue] = useState('');
    const [isTyping, setIsTyping] = React.useState(false);
    const [typingIndicator, setTypingIndicator] = React.useState(null);
    // const [debouncedIsTyping, setDebouncedIsTyping] = React.useState(false);


    // Empirica message state
    const chatChannel = player.get('chatChannel');
    const typingChannel = player.get('typingChannel');
    let messages = game.get(chatChannel) || [];
    let pairTypingStatus = game.get(typingChannel) || [false, false];
    
    // The typing channel is an attribute of the game that allows participants to see when their partner types and vice versa
    // We store these statuses in an array, so we need to get which array index is the player and which is the partner
    const participantIdx = typingChannel.split('-').indexOf(player.id)-1;
    const partnerIdx = 1 - participantIdx;


    const [msgsUI, setMsgsUI] = useState([]);
    let msgKey = 'm';
    let msgIdx = 0;
    let msgCount = 0;

    const valueRef = useRef(text);
    valueRef.current = text;
    // const inputRef = useRef();

    function updateTypingStatus(idx, val) {
        setIsTyping(val);
        const typingStatus = pairTypingStatus;
        typingStatus[idx] = val;
        return typingStatus;
    }

    // Setup communication with Python server
    useEffect(() => {

        // Handle receiving a message from the server
        window.nlpServer.onmessage = (msg) => {

            const data = JSON.parse(msg.data);
            
            // Get autocompleted text
            let completion = data.completion;
            
            // Remove any generated text that starts a new sentence. (Only complete the current sentence)
            const re = new RegExp( "[\.|\!|\?]", "g" );
            re.test(completion);
            if (re.lastIndex > 0) completion = completion.substring(0, re.lastIndex);

            // Store autocompleted text
            setAutocompleteOptions([completion]);
          };

        // Send a message to the server if the user has stopped typing for a couple seconds
        const interval = setInterval(() => { 

            // Only ask for an autocompletion once, when the user stops typing for a couple seconds
            game.set(typingChannel, updateTypingStatus(participantIdx, false));

            // Send a message to the Python server asking for an autocompletion
            window.nlpServer.send(JSON.stringify({
                command: 'autocomplete',
                incomplete_msg: valueRef.current
            }));

        }, 5 * 1000);

        // This function is run to cleanup (remove) the infinite loop of generating autocompletions when this component is unmounted
        return () => clearInterval(interval); 
    }, []);

    useEffect(() => {
        if (typeof(messages) == 'object' && 'length' in messages) {
            const uiElems = [];

            let firstFromSender = true;
            let lastSender = -1;

            for (const msg of messages) {
                
                firstFromSender = lastSender != msg.sender;
                lastSender = msg.sender

                let senderTxt = '';
                if (msg.sender == playerId) {
                    senderTxt = 'You';
                } else if (msg.sender != playerId && msg.sender != -1) {
                    senderTxt = 'Partner';
                }

                let avatar = '';
                if (msg.sender == -1) {
                    avatar = <Avatar src='images/smart_toy.svg' size='sm' />;
                }

                uiElems.push(<Message className={msg.sender == -1 ? 'botMsg' : ''} model={{
                    message: msg.txt,
                    sentTime: "just now",
                    sender: 'p'+msg.sender,
                    direction: msg.sender == playerId ? 'outgoing' : 'incoming',
                    position: 'single',
                    }} key={msgKey + msgIdx} avatarPosition="tl"><Message.Header sender={senderTxt} />{avatar}</Message>);
                msgIdx++;
            }
            let newMsgCount = msgIdx;
            if (newMsgCount > msgCount) {
                msgCount = newMsgCount;
                setMsgsUI(uiElems);
            }
        }
    }, [messages]);

    useEffect(() => {
        if (pairTypingStatus[partnerIdx] == true) {
            setTypingIndicator(<TypingIndicator content='Partner is typing'/>);
        } else {
            setTypingIndicator(null);
        }
    }, [pairTypingStatus])
    
    // Process sending a message to the partner
    function handleSend() {
        game.set(chatChannel, [...messages, {
            sender: playerId,
            sentTime: 'just now',
            txt: text
        }]);

        game.set(typingChannel, updateTypingStatus(participantIdx, false));
    }

    // Process typing in the message input field
    function handleChange(txt) {
        setText(txt.target.value);

        if (!isTyping) {
            game.set(typingChannel, updateTypingStatus(participantIdx, true));
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            setText('');
            handleSend();
        }
      }

    function handleButtonClick(evt) {
        // next();
        player.stage.set('submit', true);
    }
    function goToChat() {
        player.set('acknowledgeGroup', true);

    }

    const handleAutocompleteFill = (val) => {
        player.set('acceptSuggestion', [...player.get('acceptSuggestion'), val])
    }


    const groupTxt = playerGroup == partnerGroup ? 'the same' : 'a different';
    const groupImg = playerGroup == partnerGroup
        ? <img src="images/shake0.png" id="groupTypeIcon" className="sameGroup"/>
        : <img src="images/vs0.png" id="groupTypeIcon" />;

    const acknowledgeGroupUI = <Stack sx={{
        maxWidth: {
            sm: '30rem',
            md: '30rem'
        },
        mx: 'auto',
        mt: '10rem',
        textAlign: 'center'
    }} gap={1}>
        <Typography level="body-md">
            We finished assigning group labels and making pairs based on your questionnaire
            answers. People in the same group are likely to have shared values.
        </Typography>
        <Typography level="h1">
            Your partner is from {groupTxt} group.
        </Typography>
        {groupImg}
        <Typography level="body-md">
            Next, you will chat with your partner about an assigned topic.
        </Typography>
        <Button onClick={goToChat}>Continue to Chat</Button>
    </Stack>;

    const skipButtonUI = window.location.hostname == 'localhost'
        ? <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', flexDirection: 'row'}}><Button sx={{ my: 2 }} onClick={handleButtonClick}>(Development Only) Skip</Button></Box>
        : '';

    const chatUI = <Stack sx={{
        maxWidth: {
            sm: '30rem',
            md: '30rem'
        },
        mx: 'auto',
        mt: '10rem',
    }} gap={1} >
        <Typography level="h2" textAlign="center">
       Chat
        </Typography>
        <Typography level="body-md" textAlign="center">{msToTime(stageTimer?.remaining ? stageTimer.remaining : 0)} remaining</Typography>
        <MainContainer>
            <ChatContainer style={{height: '25rem'}}>       
                <MessageList typingIndicator={typingIndicator}>
                    {msgsUI}
                </MessageList>
                
                    {/* <MessageInput placeholder="Type message here" onSend={handleSend} onChange={handleChange} attachButton={null}> */}
                    
                    {/* </MessageInput> */}
                
            </ChatContainer>
            <div className='msgSend'>
                <Hint options={autocompleteOptions} allowTabFill={true} onFill={handleAutocompleteFill}>
                    <input type="text" placeholder="Type message here" value={text} onChange={handleChange} onKeyDown={handleKeyDown}/>
                </Hint>
                <IconButton variant="plain" onClick={handleSend}>
                    <SendRoundedIcon />
                </IconButton>
            </div>
        </MainContainer>
        {skipButtonUI}
    </Stack>;

    const ui = acknowledgedGroup ? chatUI : acknowledgeGroupUI;

    return (
        <Container maxWidth="100vw">
            {ui}   
        </Container>
        );
    }