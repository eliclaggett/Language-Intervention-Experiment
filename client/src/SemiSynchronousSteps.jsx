import React, { useState } from 'react';

import { usePlayer } from "@empirica/core/player/classic/react";
import Cooperate from "./semisync/Cooperation.jsx";
import ReflectionSurvey from "./semisync/ReflectionSurvey.jsx";
import PartnerAnswer from "./semisync/PartnerAnswer.jsx";
import End from "./semisync/End.jsx";
import PublicGoodsGame from './semisync/PublicGoods.jsx';

export default function SemiSynchronousSteps() {

    const player = usePlayer();

    const submittedCooperationDecision = player.get('submitCooperationDecision') || false;
    const submittedReflectionSurvey = player.get('submitReflectionSurvey') || false;
    const submittedPartnerAnswer = player.get('submitPartnerAnswer') || false;

    
    
    const [step, setStep] = useState(
        (submittedCooperationDecision !== false) +
        (submittedReflectionSurvey !== false) +
        (submittedPartnerAnswer !== false));

    function handleNext() {
        setStep(step + 1);
    }

    switch (step) {
        case 1:
            // return <Cooperate next={handleNext} />;
            return <PublicGoodsGame next={handleNext} />;
        case 0:
            return <ReflectionSurvey next={handleNext} />;
        case 2:
            return <PartnerAnswer next={handleNext} />;
        case 3:
            return <End />;
        default:
            return <h1>huh?</h1>;
    }
}