#!/bin/bash
tput sc
parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")/../" ; pwd -P )
cd "$parent_path"

# Load dotenv
export $(cat .env | xargs)

sftp -b - -i ~/.ssh/eli-xps eli@eli-xps.lan.local.cmu.edu <<EOF
	put "$parent_path/nlp/chat-system-complex.py" "Code/experiment/chat-cooperation/nlp"
    put -r "$parent_path/nlp/util" "Code/experiment/chat-cooperation/nlp"
	exit
EOF

tput rc
tput el

# ssh -i ~/.ssh/eli-xps eli@eli-xps.lan.local.cmu.edu -tt <<EOF
#     cd ~/Code/experiment/chat-cooperation/nlp
#     python3 chat-system-complex.py $1 $2
#     exit
# EOF

# tput rc
# tput el

echo "Done running the simulator!";