import React, { useState, useRef, useEffect } from 'react';
import { ethers } from 'ethers';
import styled, { keyframes } from 'styled-components';
import { useWeb3 } from '../contexts/Web3Context';
import Prompt from './Prompt';
import TabCompletion from './TabCompletion';
import BottomBar from './BottomBar';
import asciiArt from '../assets/ascii-art.txt';
import Chart from './Chart';
import { FaCaretUp, FaCaretRight } from 'react-icons/fa6';

const TerminalContainer = styled.div`
  background-color: #1e1e1e;
  color: #f0f0f0;
  font-family: 'Fira Code', monospace;
  padding: 20px;
  height: 100vh;
  display: flex;
  flex-direction: column;
`;

const beeMotion = keyframes`
  0% { transform: translate(0, 0) rotate(0deg); }
  25% { transform: translate(0.5px, 0.5px) rotate(0.5deg); }
  50% { transform: translate(0, 1px) rotate(0deg); }
  75% { transform: translate(-0.5px, 0.5px) rotate(-0.5deg); }
  100% { transform: translate(0, 0) rotate(0deg); }
`;

const AsciiArtContainer = styled.pre`
  font-size: 0.3em;
  line-height: 1;
  color: #00ff00;
  text-align: center;
  margin-bottom: 20px;
  animation: ${props => props.isAnimating ? beeMotion : 'none'} 0.5s infinite;
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

  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
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
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-wrap: break-word;
  font-size: 0.8em;
  color: #00ff00;
  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
`;

const TabHint = styled.span`
  color: #888;
  font-style: italic;
  margin-left: 10px;
  font-size: 0.8em;
`;

const CommandSpan = styled.span`
  color: skyblue;
`;

const HelpContainer = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
  background-color: rgba(0, 0, 0, 0.7);
  padding: 10px;
  border-radius: 5px;
  font-size: 0.8em;
  color: #ccc;
`;

const HelpItem = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 5px;
`;

const HelpIcon = styled.span`
  margin-right: 5px;
`;

const Terminal = () => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showTabCompletion, setShowTabCompletion] = useState(false);
  const [showTabHint, setShowTabHint] = useState(true);
  const [chartData, setChartData] = useState([10, 20, 15, 25, 30, 22, 18, 32, 45, 41, 50, 56, 62, 48, 45, 51, 43, 41, 38, 50, 48,47, 53, 56, 57, 75, 86, 95, 70, 56, 76]);
  const [asyncOutput, setAsyncOutput] = useState(null);
  const [asciiLogo, setAsciiLogo] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const inputRef = useRef(null);
  const terminalContentRef = useRef(null);

  const { isConnected, signer, provider, balance: nativeBalance , roseBalance, rose, reserve0, reserve1, alpha} = useWeb3();

  const availableCommands = ['deposit', 'withdraw', 'transfer', 'balance', 'address', 'clear', 'exit'];

  useEffect(() => {
    fetch(asciiArt)
      .then(response => response.text())
      .then(text => setAsciiLogo(text));
  }, []);

  useEffect(() => {
    inputRef.current.focus();
  }, []);

  useEffect(() => {
    if (terminalContentRef.current) {
      terminalContentRef.current.scrollTop = terminalContentRef.current.scrollHeight;
    }
  }, [history]);

  const animateLogo = async (callback) => {
    setIsAnimating(true);
    try {
      await callback();
    } finally {
      setIsAnimating(false);
    }
  };

  const depositCall = async (amount) => {
    const numericBalance = parseFloat(nativeBalance);
    if (amount > numericBalance) {
      return `Insufficient funds. Current balance: ${numericBalance.toFixed(4)} ETH`;
    }
  
    try {
      const tx = await signer.sendTransaction({
        to: rose,
        value: ethers.parseEther(amount.toString())
      });
      await tx.wait();
      return `Deposited ${amount} ETH. New balance: ${(numericBalance - amount).toFixed(4)} ETH`;
    } catch (error) {
      console.error("Error during deposit:", error);
      return `Error during deposit: ${error.message}`;
    }
  };

  const withdrawCall = async (amount) => {
    const numericBalance = parseFloat(nativeBalance);
    const numericRoseBalance = parseFloat(roseBalance);
    if (amount > numericRoseBalance) {
      return `Insufficient funds. Current balance: ${numericRoseBalance.toFixed(4)}🌹`;
    }
    const numericReserve1 = parseFloat(reserve1);
    if (amount > numericReserve1) {
      return `Amount too large, can only sell up to 2% of the pool. Current reserve: ${numericReserve1.toFixed(4)}🌹`;
    }
    const roseContract = new ethers.Contract(
      rose,
      ['function transfer(address to, uint256 amount) returns (bool)'],
      signer
    );
    const tx = await roseContract.transfer(rose, ethers.parseUnits(amount.toString(), 18));
    await tx.wait();
    
    // Fetch the updated native balance
    const updatedNativeBalance = await provider.getBalance(signer.address);
    const formattedUpdatedBalance = ethers.formatEther(updatedNativeBalance);
    
    return `Withdrawn ${amount}🌹. New balance: ${(numericRoseBalance - amount).toFixed(4)}🌹
Received ${(parseFloat(formattedUpdatedBalance) - numericBalance).toFixed(4)} ETH`;
  };

  const transferCall = async (amount, recipient) => {
    const numericRoseBalance = parseFloat(roseBalance);
    if (amount > numericRoseBalance) {
      return `Insufficient funds. Current balance: ${numericRoseBalance.toFixed(4)}🌹`;
    }

    let resolvedAddress;
    try {
      resolvedAddress = ethers.isAddress(recipient) ? recipient : await provider.resolveName(recipient);
    } catch (error) {
      console.error("Error resolving ENS name:", error);
    }

    if (!resolvedAddress) {
      return `<pre>Invalid recipient address or unresolved ENS name.

    usage: transfer &lt;amount&gt; &lt;recipient&gt;

    example: transfer 10 rosemoney.eth
        </pre>
       `;
    }

    const roseContract = new ethers.Contract(
      rose,
      ['function transfer(address to, uint256 amount) returns (bool)'],
      signer
    );

    try {
      const tx = await roseContract.transfer(resolvedAddress, ethers.parseUnits(amount.toString(), 18));
      await tx.wait();
      return `Transferred ${amount}🌹 to ${recipient}. New balance: ${(numericRoseBalance - amount).toFixed(4)}🌹`;
    } catch (error) {
      console.error("Error during transfer:", error);
      return `Error during transfer: ${error.message}`;
    }
  };

  const commands = {
    deposit: (args) => {
      const amount = parseFloat(args[0]);
      if (isNaN(amount) || amount <= 0) {
        return `<pre>Invalid amount. Please enter a positive number.
            
    usage: deposit &lt;amount&gt;
        </pre>
       `;
      }
      
      // Set initial processing message
      setAsyncOutput(`Processing deposit of ${amount} ETH...`);

      animateLogo(async () => {
        const result = await depositCall(amount);
        setAsyncOutput(result);
      });

      return null; // Return null to prevent immediate output
    },
    withdraw: (args) => {
      const amount = parseFloat(args[0]);
      if (isNaN(amount) || amount <= 0) {
        return `<pre>Invalid amount. Please enter a positive number.

    usage: withdraw &lt;amount&gt;
        </pre>
       `;
      }
      
      // Set initial processing message
      setAsyncOutput(`Processing withdrawal of ${amount}🌹...`);

      animateLogo(async () => {
        const result = await withdrawCall(amount);
        setAsyncOutput(result);
      });

      return null; // Return null to prevent immediate output
    },
    transfer: (args) => {
      const amount = parseFloat(args[0]);
      const recipient = args[1];
      if (isNaN(amount) || amount <= 0 || args.length < 2) {
        return `<pre>Please enter a positive number and a valid destination address.

    usage: transfer &lt;amount&gt; &lt;recipient&gt;
        </pre>
       `;
      }
      
      // Set initial processing message
      setAsyncOutput(`Processing transfer of ${amount}🌹 to ${recipient}...`);

      animateLogo(async () => {
        const result = await transferCall(amount, recipient);
        setAsyncOutput(result);
      });

      return null; // Return null to prevent immediate output
    },
    balance: (args) => {
      if (args.length > 0) {
        return `<pre>balance does not take additional arguments.

    usage: balance
        </pre>
       `;
      }
      if (nativeBalance) {
        const numericBalance = parseFloat(nativeBalance);
        return `Current balance: ${numericBalance.toFixed(4)} ETH`;
      }
      return 'No wallet connected.';
    },
    address: (args) => {
      if (args.length > 0) {
        return `<pre>address does not take additional arguments.

    usage: address
        </pre>
       `;
      }
      if (signer) {
        return `Wallet address: ${signer.address}`;
      }
      return 'No wallet connected.';
    },
    clear: (args) => {
      if (args.length > 0) {
        return `<pre>clear does not take additional arguments.

    usage: clear
        </pre>
       `;
      }
      setHistory([]);
      setShowTabHint(true);
      return '';
    },
    exit: (args) => {
      if (args.length > 0) {
        return `<pre>exit does not take additional arguments.

    usage: exit
        </pre>
       `;
      }
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
        let out = '';
        if (!isConnected && command !== 'exit') {
          out = 'Please connect your wallet.';
        } else {
          out = commands[command](args);
        }
        if (out !== null) {
          setHistory((prev) => [...prev, { type: 'output', content: out }]);
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

  useEffect(() => {
    if (asyncOutput !== null) {
      setHistory((prev) => [...prev, { type: 'output', content: asyncOutput }]);
      setAsyncOutput(null);
    }
  }, [asyncOutput]);

  const handleTextSelection = () => {
    const selectedText = window.getSelection().toString();
    if (selectedText) {
      navigator.clipboard.writeText(selectedText).then(
        () => {
          console.log('Text copied to clipboard');
          // Optionally, you can show a brief notification to the user
        },
        (err) => {
          console.error('Failed to copy text: ', err);
        }
      );
    }
  };

  return (
    <TerminalContainer onClick={() => inputRef.current.focus()}>
      <AsciiArtContainer isAnimating={isAnimating}>{asciiLogo}</AsciiArtContainer>
      <HelpContainer>
        <HelpItem><HelpIcon>⇥</HelpIcon> for options</HelpItem>
        <HelpItem><HelpIcon><FaCaretUp /></HelpIcon> for historic commands</HelpItem>
        <HelpItem><HelpIcon>↵</HelpIcon> to run a command</HelpItem>
        <HelpItem>Click ticker to switch balance</HelpItem>
        <HelpItem>Click on the balance to copy</HelpItem>
        <HelpItem>Select text to copy</HelpItem>
      </HelpContainer>
      <TerminalContent 
        ref={terminalContentRef}
        onMouseUp={handleTextSelection}
        onTouchEnd={handleTextSelection}
      >
        {history.map((item, index) => (
          <div key={index}>
            {item.type === 'command' ? (
              <>
                <Prompt />
                <CommandSpan>{item.content}</CommandSpan>
              </>
            ) : (
              <OutputDiv dangerouslySetInnerHTML={{ __html: item.content }} />
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
      <BottomBar />
    </TerminalContainer>
  );
};

export default Terminal;
