/*
 * Filename: PublicGoods.jsx
 * Author: Elijah Claggett
 *
 * Description:
 * This ReactJS file evaluates the level at which whether a particpant will cooperate or defect from their partner(s).
 */

// Imports
import * as React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import WarningIcon from "@mui/icons-material/Warning";
import {
  Alert,
  Button,
  Box,
  Container,
  FormControl,
  FormLabel,
  Grid,
  Typography,
  Stack,
  List,
  ListItem,
  Radio,
  RadioGroup,
  Slider,
  Textarea,
} from "@mui/joy";
import { useState } from "react";
import {
  usePlayer,
  useGame,
  useStageTimer,
  useStage,
} from "@empirica/core/player/classic/react";
import { formatMoney, msToTime } from "../utils/formatting.js";

export default function PublicGoodsGame({ next }) {
  const player = usePlayer();
  const stage = useStage();
  const stageTimer = useStageTimer();
  const gameParams = player.get("gameParams");
  const game = useGame();
  const [cooperationExplanation, setCooperationExplanation] = useState("");
  const [hypothetical, setHypothetical] = useState("");
  const [shareType, setShareType] = useState("Keep");
  const [shareAmt, setShareAmt] = useState(0);
  const riskDisplayClass = shareAmt >= 1 ? "" : "hidden";
  const minBonus = gameParams.bonus - shareAmt;

  let timeLeftTxt = "";
  if (stage.get("name") == "semi_asynchronous_steps") {
    let timeLeft = stageTimer?.remaining ? stageTimer.remaining : 0;
    timeLeftTxt = (
      <span style={{ color: "rgb(102, 93, 245)" }}>
        {msToTime(timeLeft)} remaining to finish the survey.
        <br />
      </span>
    );
  }

  function handleButtonClick(evt) {
    player.set("submitCooperationDecision", shareType == "Keep" ? 0 : shareAmt);
    player.set("submitCooperationType", shareType);
    player.set("submitCooperationExplanation", cooperationExplanation);
    player.set("submitHypothetical", hypothetical);

    game.set("submitCooperationDecision", {
      playerId: player.id,
      cooperationDecision: shareAmt,
      cooperationType: shareType,
    });
    next();
  }

  ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip);

  const maxShareAmt = gameParams.maxBonusShare;

  const options = {
    responsive: true,
    plugins: {
      title: { display: false },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        min: 0,
        max: gameParams.bonus + maxShareAmt * 2,
        grid: {
          display: false,
        },
      },
    },
    aspectRatio: 1,
  };

  const defaultPlayer = gameParams.bonus;
  const defaultPartner = gameParams.bonus;
  const currentPlayer = defaultPlayer - shareAmt;
  let currentPartner = defaultPartner;
  if (shareType == "Share")
    currentPartner += shareAmt * gameParams.shareMultiplier;
  else currentPartner -= shareAmt * gameParams.shareMultiplier;

  const labels = [
    ["Original", formatMoney(defaultPlayer)],
    ["Current", formatMoney(currentPlayer)],
  ];

  const data = {
    labels,
    datasets: [
      {
        label: "",
        data: [defaultPlayer, currentPlayer],
        backgroundColor: ["rgba(50, 50, 50, 0.2)", "rgb(37, 99, 235)"],
      },
    ],
  };

  const partnerLabels = [
    ["Original", formatMoney(defaultPartner)],
    ["Current", formatMoney(currentPartner)],
  ];
  const partnerData = {
    labels: partnerLabels,
    datasets: [
      {
        label: "Partner",
        data: [defaultPartner, currentPartner],
        backgroundColor: ["rgba(50, 50, 50, 0.2)", "rgb(37, 99, 235)"],
      },
    ],
  };

  let shareUI = "";
  let shareTxt = "keep your bonus";
  if (shareType == "Share") {
    shareUI = (
      <Stack sx={{ alignItems: "center" }}>
        <Typography level="body-md">
          Use the slider to specify an amount from {formatMoney(0)} to{" "}
          {formatMoney(gameParams.maxBonusShare)}
        </Typography>
        <Slider
          style={{ width: "20rem", mx: "auto" }}
          value={shareAmt}
          min={0}
          max={maxShareAmt}
          step={0.1}
          onChange={(e) => setShareAmt(e.target.value)}
        />
        <Grid
          container
          columns={2}
          columnGap={8}
          justifyContent="center"
          alignItems="center"
        >
          <div className="potContainer">
            <span>
              Effect on <b>your</b>
              <br />
              bonus
            </span>
            <Bar options={options} data={data} />
          </div>
          <div className="potContainer">
            <span>
              Effect on <b>partner's</b>
              <br />
              bonus
            </span>
            <Bar options={options} data={partnerData} />
          </div>
        </Grid>
        <Alert
          startDecorator={<WarningIcon />}
          title="Risk"
          color="warning"
          className={riskDisplayClass}
          sx={{ my: 3 }}
        >
          <div>
            <div>
              <strong>High Allocation Risk</strong>
            </div>
            <Typography level="body-sm" color="warning">
              Your bonus could decrease to{" "}
              <strong>{formatMoney(minBonus)}</strong> depending on your
              partner's allocation decision.
            </Typography>
          </div>
        </Alert>
      </Stack>
    );

    shareTxt = "share " + formatMoney(shareAmt);
  }

  return (
    <Container maxWidth="100vw">
      <Stack
        sx={{
          maxWidth: {
            md: "30rem",
          },
          mx: "auto",
          mt: "10rem",
          alignItems: "center",
        }}
        gap={1}
      >
        <Typography level="h2" textAlign="center">
          Bonus Allocation
        </Typography>
        <Typography level="body-md" textAlign="center">
          {timeLeftTxt}
          <br />
          You have been awarded a {formatMoney(gameParams.bonus)} bonus. Please
          decide how you would like to allocate your bonus payment. You may:
        </Typography>
        <List component="ul" marker="disc">
          <ListItem>Keep your bonus</ListItem>
          <ListItem>Pay to share it with your partner</ListItem>
        </List>
        <Typography level="body-md" textAlign="center">
          The effect on your partner is {gameParams.shareMultiplier}x the amount
          you share.
        </Typography>
        <Typography level="body-md">
          Would you like to keep or share your bonus?
        </Typography>
        <RadioGroup
          aria-label="Share type"
          name="shareType"
          defaultValue="Keep"
          onChange={(e) => setShareType(e.target.value)}
        >
          <List
            sx={{
              "--List-gap": "0.5rem",
              "--ListItem-paddingY": "1rem",
              "--ListItem-radius": "8px",
              "--ListItemDecorator-size": "32px",
            }}
          >
            {["Keep", "Share"].map((item, index) => (
              <ListItem variant="outlined" key={item} sx={{ boxShadow: "sm" }}>
                <Radio
                  overlay
                  value={item}
                  label={item}
                  sx={{ flexGrow: 1, flexDirection: "row-reverse" }}
                  slotProps={{
                    action: ({ checked }) => ({
                      sx: (theme) => ({
                        ...(checked && {
                          inset: -1,
                          border: "2px solid",
                          borderColor: theme.vars.palette.primary[500],
                        }),
                      }),
                    }),
                  }}
                />
              </ListItem>
            ))}
          </List>
        </RadioGroup>
        {shareUI}

        <Typography level="body-md" textAlign={"center"}>
          To help us understand your decision, it would be great if you could
          answer the following questions.
        </Typography>
        <FormControl>
          <FormLabel>Please explain why you selected to {shareTxt}</FormLabel>
          <Textarea
            minRows={3}
            value={cooperationExplanation}
            onChange={(e) => setCooperationExplanation(e.target.value)}
            placeholder="Type answer here"
          />
        </FormControl>

        <FormControl>
          <FormLabel sx={{ textAlign: "center" }}>
            In what situation would you make a different decision?
          </FormLabel>
          <Textarea
            minRows={3}
            value={hypothetical}
            onChange={(e) => setHypothetical(e.target.value)}
            placeholder="Type answer here"
          />
        </FormControl>

        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            width: "100%",
            flexDirection: "row",
          }}
        >
          <Button sx={{ my: 2 }} onClick={handleButtonClick}>
            Confirm Decision
          </Button>
        </Box>
      </Stack>
    </Container>
  );
}
