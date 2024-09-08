import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import Prompt from './Prompt';
import TabCompletion from './TabCompletion';
import BottomBar from './BottomBar';
import { ReactComponent as Logo } from '../assets/rose.svg';
import Chart from './Chart';

const TerminalContainer = styled.div`
  background-color: #1e1e1e;
  color: #f0f0f0;
  font-family: 'Fira Code', monospace;
  padding: 20px;
  height: 100vh;
  display: flex;
  flex-direction: column;
`;

const LogoContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
`;

const StyledLogo = styled(Logo)`
  width: auto;
  height: auto; /* Maintain aspect ratio by adjusting the height */
`;
  
const TerminalContent = styled.div`
  flex-grow: 1;
  overflow-y: auto;
  margin-bottom: 5px;
  color: #ffffff;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-wrap: break-word;
  scrollbar-width: none;  /* Firefox */
  -ms-overflow-style: none;  /* Internet Explorer 10+ */
  
  &::-webkit-scrollbar {
    width: 0;
    height: 0;
    display: none;  /* Chrome, Safari, and Opera */
  }
`;

const InputContainer = styled.div`
  display: flex;
  align-items: center;
`;

const Input = styled.input`
  background-color: transparent;
  border: none;
  color: skyblue;
  font-family: inherit;
  font-size: inherit;
  outline: none;
  flex-grow: 1;
`;

const OutputDiv = styled.div`
  white-space: pre-wrap;       /* Preserves whitespace and wraps text */
  word-wrap: break-word;       /* Breaks long words if needed */
  overflow-wrap: break-word;   /* Ensures long words break correctly */
  font-size: 0.8em;
`;

const TabHint = styled.span`
  color: #888;
  font-style: italic;
  margin-left: 10px;
  font-size: 0.8em;
`;

const Terminal = () => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showTabCompletion, setShowTabCompletion] = useState(false);
  const [showTabHint, setShowTabHint] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [balance, setBalance] = useState(0);
  const [chartData, setChartData] = useState([10, 20, 15, 25, 30, 22, 18]);
  const inputRef = useRef(null);
  const terminalContentRef = useRef(null);

  const availableCommands = ['deposit', 'withdraw', 'echo', 'clear', 'exit'];

  useEffect(() => {
    inputRef.current.focus();
  }, []);

  useEffect(() => {
    if (terminalContentRef.current) {
      terminalContentRef.current.scrollTop = terminalContentRef.current.scrollHeight;
    }
  }, [history]);

  const depositCall = (amount) => {
    if (amount > balance) {
      return `Insufficient funds. Current balance: ${balance.toFixed(4)} ETH`;
    }
    setBalance(prevBalance => prevBalance - amount);
    return `Deposited ${amount} ETH. New balance: ${(balance - amount).toFixed(4)} ETH`;
  };

  const withdrawCall = (amount) => {
    setBalance(prevBalance => prevBalance + amount);
    return `Withdrawn ${amount} ETH. New balance: ${(balance + amount).toFixed(4)} ETH`;
  };

  const commands = {
    deposit: (args) => {
      const amount = parseFloat(args[0]);
      if (isNaN(amount) || amount <= 0) {
        return `<pre>Invalid amount. Please enter a positive number.
            
    usage: deposit &lt;amount&gt;
            
This command will return a note allowing an account to withdraw the deposited funds later.
        </pre>
       `;
            
      }
      return depositCall(amount);
    },
    withdraw: (args) => {
      const amount = parseFloat(args[0]);
      if (isNaN(amount) || amount <= 0) {
        return `<pre>Invalid amount. Please enter a positive number.

    usage: withdraw &lt;note&gt;
        </pre>
       `;
      }
      return withdrawCall(amount);
    },
    echo: (args) => {
      if (!args[0]) {
        return `<pre>available commands:
    echo &lt;text&gt; - prints the text
    echo &lt;address&gt; - prints the wallet address
    echo &lt;balance&gt; - prints the balance of the connected account
    echo &lt;status&gt; - prints the connection status
    echo &lt;commands&gt; - prints the available commands
    echo &lt;history&gt; - prints the command history
        </pre>`;
    } else if (args[0] === 'balance') {
        return `Current balance: ${balance.toFixed(4)} ETH`;
      } else if (args[0] === 'status') {
        return `Connection status: ${isConnected ? 'Connected' : 'Disconnected'}`;
      } else if (args[0] === 'commands') {
        return `Available commands: ${availableCommands.join(', ')}`;
      } else if (args[0] === 'history') {
        return `Command history: ${commandHistory.join(', ')}`;
      } else if (args[0] === 'address') {
        return `Wallet address: 0x1234...5678`;
      } else {
        args.join(' ')
      }

    },
    clear: () => {
      setHistory([]);
      setShowTabHint(true);
      return '';
    },
    exit: () => {
      window.close();
      return 'Closing terminal...';
    },
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (e.target.value === '' && e.nativeEvent.inputType === 'deleteContentBackward') {
      setShowTabHint(true);
    } else {
      setShowTabHint(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      const trimmedInput = input.trim();
      if (trimmedInput) {
        setCommandHistory(prev => [...prev, trimmedInput]);
        setHistoryIndex(-1);
      }
      const [command, ...args] = trimmedInput.split(' ');
      setHistory([...history, { type: 'command', content: trimmedInput }]);

      if (commands[command]) {
        // if not connected
        let out = '';
        if (!isConnected && command !== 'exit') {
          out = 'Please connect your wallet.';
        } else {
          out = commands[command](args);
        }
        const output = out;
        if (output) {
          setHistory((prev) => [...prev, { type: 'output', content: output }]);
        }
      } else {
        setHistory((prev) => [...prev, { type: 'output', content: `Command not found: ${command}` }]);
      }

      setInput('');
      setShowTabHint(true);
      setShowTabCompletion(false);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // if (showTabCompletion) {
      //   // Cycle through tab completion options
      //   setTabCompletionIndex((prevIndex) => (prevIndex + 1) % availableCommands.length);
      // } else {
        setShowTabCompletion(true);
        // setTabCompletionIndex(0);
      // }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowTabCompletion(false);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  const handleTabCompletion = (selectedCommand) => {
    setInput(selectedCommand);
    setShowTabCompletion(false);
    setShowTabHint(false);
    inputRef.current.focus();
  };

  const handleConnect = () => {
    setIsConnected(!isConnected);
    if (!isConnected) {
      setBalance(Math.random() * 100);
    } else {
      setBalance(0);
    }
  };

  return (
    <TerminalContainer onClick={() => inputRef.current.focus()}>
      <LogoContainer>
        <StyledLogo />
      </LogoContainer>
      <TerminalContent ref={terminalContentRef}>
        {history.map((item, index) => (
          <div key={index}>
            {item.type === 'command' ? <Prompt /> : null}
            {item.type === 'output' ? (
              <OutputDiv dangerouslySetInnerHTML={{ __html: item.content }} />
            ) : (
              item.content
            )}
          </div>
        ))}
        <InputContainer>
          <Prompt />
          <Input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
          />
          {showTabHint && <TabHint>press tab to see options</TabHint>}
        </InputContainer>
        {showTabCompletion && (
          <TabCompletion options={availableCommands} inputText={input} onSelect={handleTabCompletion} />
        )}
      </TerminalContent>
      <Chart data={chartData} />
      <BottomBar isConnected={isConnected} balance={balance} onConnect={handleConnect} />
    </TerminalContainer>
  );
};

export default Terminal;
