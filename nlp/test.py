import re

next_msg = 'Hi how are you? I am fine'
sentences = re.findall(r'[^\.!\?]+[\.!\?]', next_msg)
if len(sentences) > 2:
    next_msg = ''.join(sentences[0:2])

end = 0
for match in re.finditer(r'[\.!\?]', next_msg):
    end = match.end()
next_msg = next_msg[:end+1]
print(next_msg)