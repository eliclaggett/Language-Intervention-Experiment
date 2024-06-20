#!/bin/bash
tput sc
parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")/../" ; pwd -P )
cd "$parent_path"

# Load dotenv
export $(cat .env | xargs)

# Upload latest version
sftp -b - -i ~/.ssh/eli-xps eli@eli-xps.lan.local.cmu.edu <<EOF
	put "$parent_path/.env" "Code/experiment/chat-cooperation/nlp/.env"
	put "$parent_path/nlp/nlp.py" "Code/experiment/chat-cooperation/nlp"
    put -r "$parent_path/nlp/util" "Code/experiment/chat-cooperation/nlp"
	exit
EOF

# Run ML server
ssh -i ~/.ssh/eli-xps eli@eli-xps.lan.local.cmu.edu bash << EOF
 if test -f ~/RUNNING_PID
 then
 kill \`cat ~/RUNNING_PID\`
 rm ~/RUNNING_PID
 echo "Killed previously running NLP"
 fi
 . ~/.profile
 cd ~/Code/experiment/chat-cooperation/nlp
 python3 nlp.py &
 echo \$! > ~/RUNNING_PID
EOF