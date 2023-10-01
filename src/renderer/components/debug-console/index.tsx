import React, { useState, useEffect } from 'react';

const DebugConsole = () => {
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = window.electron.debugBridge.listenForDebugMessages(
      (message) => {
        setMessages((prevMessages: string[]) => [...prevMessages, message]);
      },
    );

    return;
  }, []);

  if (!messages.length) return null;

  return (
    <div
      style={{
        maxHeight: '200px',
        overflowY: 'scroll',
        border: '1px solid black',
        padding: '5px',
      }}
    >
      {messages.map((msg, index) => (
        <div key={index}>{msg}</div>
      ))}
    </div>
  );
};

export default DebugConsole;
