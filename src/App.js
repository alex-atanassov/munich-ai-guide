import { useState, useRef, useEffect } from "react";
import "./App.css"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRobot } from '@fortawesome/free-solid-svg-icons'
import { faUser } from '@fortawesome/free-solid-svg-icons'
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons'
import { Avatar } from "react-daisyui";

const App = () => {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState(['Hello! How can I assist you today?']);
  const chatRef = useRef(null);

  useEffect(() => {
    // chatRef.current?.scrollIntoView();
    chatRef.current?.scrollIntoView({behavior: "smooth"});
  }, [messages])

  const onEnterPress = (e) => {
    if(e.keyCode === 13 && e.shiftKey === false) {
      e.preventDefault();
      getCompletion(e);
    }
  }

  const getCompletion = async (e) => {
    e.preventDefault()
    setMessages([...messages, prompt, ""]);
    setPrompt("")

    const response = await fetch("http://localhost:8000/completion", {
      method: 'POST',
      body: JSON.stringify({text: prompt}),
      headers: {'Content-Type': 'application/json'}
    });

    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
    while(true) {
      const {value, done} = await reader.read()
      if(done) break
      setMessages((prev) => [...prev.slice(0,-1), prev.slice(-1)[0] + value])
    }
  };

  return (
    <div>
      <main className="main">
        {/* <img src="/logo192.png" className="icon" alt="logo"/> */}
        <h3>Munich AI Guide</h3>
        
        {/* <div className="result">
          <div>{messages.map(msg => {
            return <p>{msg}<br /></p>
          })}</div>
          <p>{answer}</p>
        </div> */}

        <div className="result w-2/3">
          {messages.map((message, index) => (
            <div className="mt-4">
              {message.length !== 0 &&
              <div className="flex items-center">
                <Avatar shape="circle" className="mr-4">
                  <div className="rounded-full h-10 w-10 text-center content-center">
                    {index % 2 === 0 ? 
                    <FontAwesomeIcon icon={faRobot} size="2x" className="bot"/>
                    : <FontAwesomeIcon icon={faUser} size="2x" className="user"/>}
                  </div>
                </Avatar>
                <div>
                  {index % 2 === 0 ? 
                  <h4 className="font-semibold select-none bot">Chatbot</h4>
                  : <h4 className="font-semibold select-none user">Alessandro</h4>}
                </div>
              </div>}
              <div className="ml-16 mt-1 mb-6">
                <div>{message}</div>
              </div>
            </div>
          ))}<div ref={chatRef}></div>
        </div>

        <form onSubmit={getCompletion} autoComplete="off">
          <textarea
            name="question"
            placeholder="Type here to enter a question"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={onEnterPress}
          />
          {/* <AudioRecorder
            onRecordingComplete={sendAudioInput}
            audioTrackConstraints={{
              noiseSuppression: true,
              echoCancellation: true,
            }}
            onNotAllowedOrFound={(err) => console.table(err)}
            // showVisualizer={true}
          /> */}
          <button onClick={getCompletion} disabled={prompt===""}>
            <FontAwesomeIcon icon={faPaperPlane} size="xl"/>
          </button>
        </form>
        
      </main>
    </div>
  );
}

export default App;
