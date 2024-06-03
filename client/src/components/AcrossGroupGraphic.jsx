/*
 * Filename: AcrossGroupGraphic.jsx
 * Author: Elijah Claggett
 *
 * Description:
 * This ReactJS component is graphic element to express that participants and their partners have different group identities.
 */
import React from "react";
import { FormControl, FormLabel, Typography, RadioGroup } from '@mui/joy';
import { usePlayer, useGame, useStageTimer } from "@empirica/core/player/classic/react";

export default function AcrossGroupGraphic({
    topic = -1,
    opinionDirection = -1
}) {
    const player = usePlayer();
    const playerId = player.id;
    const gameParams = player.get('gameParams');

    const opinionText = opinionDirection > 3 ? 'agree' : 'disagree';

    const surveyQuestions = [
        "I would want my kids to be taught evolution as a fact of biology",
        "My second amendment right to bear arms should be protected",
        "I support funding the military",
        "Our children are being indoctrinated at school with LGBT messaging",
        "I would pay higher taxes to support climate change research",
        "Restrictions to stop the spread of COVID-19 went too far",
        "I want stricter immigration requirements into the U.S."
    ]
    const topicIdx = parseInt(topic.substring(1))-1;
    const opinionStatement = surveyQuestions[topicIdx];

    const politicalClasses = ['liberal', 'conservative'];
    let politicalIdx = 0;
    if (
        (topicIdx == 0 && opinionDirection < 3) ||
        (topicIdx == 1 && opinionDirection > 3) ||
        (topicIdx == 2 && opinionDirection > 3) ||
        (topicIdx == 3 && opinionDirection > 3) ||
        (topicIdx == 4 && opinionDirection < 3) ||
        (topicIdx == 5 && opinionDirection > 3) ||
        (topicIdx == 6 && opinionDirection > 3)
    ) {
        politicalIdx = 1;
    }


    return (
        <div className="acrossGroupGraphic">
            <div className={"mainGroup "+politicalClasses[politicalIdx]}>
                <span className="material-symbols-outlined icon-left">diversity_3</span>
                You have been grouped with millions of Americans who all {opinionText} with: "{opinionStatement}"
            </div>
            
            <div className={"opposingGroup "+politicalClasses[1-politicalIdx]}>
                Your partner has an opposing opinion.
                <span className="material-symbols-outlined icon-right">person</span>
            </div>
        </div>
    );
}
