#!/bin/bash
tput sc
parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")/../" ; pwd -P )
cd "$parent_path"

# Load dotenv
export $(cat .env | xargs)

# Upload latest version
sftp -b - -i ~/.ssh/eli-xps eli@eli-xps.lan.local.cmu.edu <<EOF
	put "$parent_path/nlp/nlp.py" "Code/experiment/chat-cooperation/nlp"
	put "$parent_path/nlp/test.py" "Code/experiment/chat-cooperation/nlp"
    put -r "$parent_path/nlp/util" "Code/experiment/chat-cooperation/nlp"
	exit
EOF

tput rc
tput el
echo "Done deploying the NLP code!";