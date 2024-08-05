import React, { useState } from 'react';

import { usePlayer } from "@empirica/core/player/classic/react";

import ReflectionSurvey from "./semisync/ReflectionSurvey.jsx";
import PartnerAnswer from "./semisync/PartnerAnswer.jsx";
import End from "./semisync/End.jsx";
import PublicGoodsGame from './semisync/PublicGoods.jsx';
import ChatEndAcknowledgement from './semisync/ChatEndAcknowledgement.jsx';
import Conversation from './sync/Conversation.jsx';

export default function SemiSynchronousSteps() {

    const player = usePlayer();
    console.log('semi-sync');

    const chatEnded = (player.get('serverChatEnded') || player.get('processEarlyFinish')) || false;
    const acknowledgedChatEnd = player.get('passedChat') || false;
    const submittedCooperationDecision = player.get('submitCooperationDecision') || false;
    const submittedReflectionSurvey = player.get('submitReflectionSurvey') || false;
    const submittedPartnerAnswer = player.get('submitPartnerAnswer') || false;
    
    const [step, setStep] = useState(
        (chatEnded !== false) +
        (acknowledgedChatEnd !== false) +
        (submittedCooperationDecision !== false) +
        (submittedReflectionSurvey !== false) +
        (submittedPartnerAnswer !== false));

    function handleNext() {
        setStep(step + 1);
        return 'Loading...';
    }

    switch (step) {
        case 0:
            return <Conversation next={handleNext} />;
        case 1:
            return <ChatEndAcknowledgement next={handleNext} />;
        case 2:
            return <ReflectionSurvey next={handleNext} />;
        case 3:
            return <PublicGoodsGame next={handleNext} />;
        case 4:
            return <PartnerAnswer next={handleNext} />;
        case 5:
            return <End />;
        default:
            return <h1>huh?</h1>;
    }
}