--- logic
const { msg } = defineProps();

--- style
.bubble-wrapper-me {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  margin-bottom: 8px;
}
.bubble-wrapper-them {
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  margin-bottom: 8px;
}
.bubble-me {
  background-color: #0284c7;
  color: #ffffff;
  padding: 10px 14px;
  border-radius: 12px;
  max-width: 80%;
}
.bubble-them {
  background-color: #ffffff;
  color: #0f172a;
  padding: 10px 14px;
  border-radius: 12px;
  max-width: 80%;
  border-width: 1px;
  border-color: #e2e8f0;
}
.msg-text-me {
  font-size: 14px;
  color: #ffffff;
  line-height: 18px;
}
.msg-text-them {
  font-size: 14px;
  color: #0f172a;
  line-height: 18px;
}
.time-me {
  font-size: 10px;
  color: #bae6fd;
  margin-top: 4px;
  text-align: right;
}
.time-them {
  font-size: 10px;
  color: #94a3b8;
  margin-top: 4px;
  text-align: left;
}

--- ui
if msg.sender === 'me'
  div.bubble-wrapper-me
    div.bubble-me
      span.msg-text-me {msg.text}
      span.time-me {msg.time}
else
  div.bubble-wrapper-them
    div.bubble-them
      span.msg-text-them {msg.text}
      span.time-them {msg.time}
