import React, { useState, useRef, useEffect } from 'react';
import { ethers } from 'ethers';
import styled from 'styled-components';
import { useWeb3 } from '../contexts/Web3Context';
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
  height: auto;
  position: relative;
  filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.5));

  &::after {
    content: '';
    position: absolute;
    top: -30px;
    left: -30px;
    right: -30px;
    bottom: -30px;
    border-radius: 50%;
    background: radial-gradient(circle at center, rgba(255, 255, 255, 0.5) 0%, transparent 70%);
    animation: glowMotion 2s ease-in-out infinite;
  }

  @keyframes glowMotion {
    0%, 100% {
      transform: scale(1);
      opacity: 0.3;
    }
    50% {
      transform: scale(1.5);
      opacity: 0.8;
    }
  }
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

const Terminal = () => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showTabCompletion, setShowTabCompletion] = useState(false);
  const [showTabHint, setShowTabHint] = useState(true);
  const [chartData, setChartData] = useState([10, 20, 15, 25, 30, 22, 18, 32, 45, 41, 50, 56, 62, 48, 45, 51, 43, 41, 38, 50, 48,47, 53, 56, 57, 75, 86, 95, 70, 56, 76]);
  const [asyncOutput, setAsyncOutput] = useState(null);
  const inputRef = useRef(null);
  const terminalContentRef = useRef(null);

  const { isConnected, signer, provider, balance: nativeBalance , roseBalance, rose, reserve0, reserve1, alpha} = useWeb3();

  const availableCommands = ['deposit', 'withdraw', 'transfer', 'balance', 'address', 'clear', 'exit'];

  useEffect(() => {
    inputRef.current.focus();
  }, []);

  useEffect(() => {
    if (terminalContentRef.current) {
      terminalContentRef.current.scrollTop = terminalContentRef.current.scrollHeight;
    }
  }, [history]);

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

      depositCall(amount)
        .then((result) => {
          setAsyncOutput(result);
        })
        .catch((error) => {
          console.error(error);
          setAsyncOutput(`Error during deposit: ${error.message}`);
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

      withdrawCall(amount)
        .then((result) => {
          setAsyncOutput(result);
        })
        .catch((error) => {
          console.error(error);
          setAsyncOutput(`Error during withdrawal: ${error.message}`);
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

      transferCall(amount, recipient)
        .then((result) => {
          setAsyncOutput(result);
        })
        .catch((error) => {
          console.error(error);
          setAsyncOutput(`Error during transfer: ${error.message}`);
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
      <LogoContainer>
        <StyledLogo />
      </LogoContainer>
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
