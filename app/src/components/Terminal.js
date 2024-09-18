import React, { useState, useRef, useEffect } from 'react';
import { ethers } from 'ethers';
import styled, { keyframes } from 'styled-components';
import { useWeb3 } from '../contexts/Web3Context';
import Prompt from './Prompt';
import TabCompletion from './TabCompletion';
import BottomBar from './BottomBar';
import asciiArt from '../assets/ascii-art.txt';
import Chart from './Chart';
import { FaCircleInfo, FaEthereum, FaGithub } from 'react-icons/fa6';
import Intro from './Intro';
import SnakeGame from './SnakeGame';
import { usePopUp } from '../contexts/PopUpContext';

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
  
  &::-webkit-scrollbar {
    width: 0;
    height: 0;
    display: none;  /* Chrome, Safari, and Opera */
  }

  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
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

const HelpContent = styled.div`
  display: none;
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 10px;
  background-color: rgba(0, 0, 0, 0.7);
  padding: 10px;
  border-radius: 5px;
  cursor: none;
  white-space: nowrap;
`;

const HelpContainer = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
  font-size: 0.8em;
  color: #ccc;
  cursor: none;

  &:hover ${HelpContent} {
    display: block;
  }
`;

const HelpItem = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 5px;
  cursor: none;
`;

const HelpIcon = styled.span`
  margin-right: 5px;
`;

const glitterAnimation = keyframes`
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
`;

const GlitterContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
`;

const Glitter = styled.div`
  position: absolute;
  width: 5px;
  height: 5px;
  background-color: #fff;
  border-radius: 50%;
  opacity: 0;
  animation: ${glitterAnimation} 0.5s infinite;
  animation-delay: ${props => props.delay}s;
  top: ${props => props.top}%;
  left: ${props => props.left}%;
`;

const AsciiArtWrapper = styled.div`
  position: relative;
  display: inline-block;
`;

const EthIcon = styled(FaEthereum)`
  vertical-align: middle;
  margin-right: 2px;
`;

const GitHubLink = styled.a`
  position: absolute;
  top: 20px;
  left: 20px;
  color: #ccc;
  font-size: 24px;
  cursor: pointer;
  text-decoration: none;
  z-index: 10;  // Add this to ensure the link is above other elements
  
  &:hover {
    color: #fff;
  }
`;

const Terminal = () => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showTabCompletion, setShowTabCompletion] = useState(false);
  const [showTabHint, setShowTabHint] = useState(true);
  const [chartData, setChartData] = useState([1, 0.8, 1.5, 1.9, 1.8, 2.5, 1.1, 1.5, 1.7, 2.2, 3.3, 3.5, 4.5, 4.8, 4.2, 5.3, 4.1, 4.7, 5.8, 6.3, 6.1, 4.2, 5.1, 6.1, 6.7, 7.8, 8.7, 10, 20, 15, 25, 30, 22, 18, 32, 45, 41, 50, 56, 62, 48, 45, 51, 43, 41, 38, 50, 48,47, 53, 56, 57, 75, 86, 95, 70, 56, 76]);
  const [asyncOutput, setAsyncOutput] = useState(null);
  const [asciiLogo, setAsciiLogo] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [showSnakeGame, setShowSnakeGame] = useState(false);
  const inputRef = useRef(null);
  const terminalContentRef = useRef(null);

  const { isConnected, signer, provider, balance: nativeBalance , roseBalance, rose, reserve0, reserve1, alpha} = useWeb3();
  const { showPopUp } = usePopUp();

  const availableCommands = ['buy', 'sell', 'transfer', 'balance', 'address', 'snake', 'clear', 'exit'];

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

  const buyCall = async (amount) => {
    const numericBalance = parseFloat(nativeBalance);
    if (amount > numericBalance) {
      return `Insufficient funds. Current balance: ${numericBalance.toFixed(6)} <EthIcon />`;
    }
  
    try {
      const tx = await signer.sendTransaction({
        to: rose,
        value: ethers.parseEther(amount.toString())
      });
      await tx.wait();
      const roseContract = new ethers.Contract(
        rose,
        ['function balanceOf(address account) view returns (uint256)'],
        provider
      );
      const updatedRoseBalance = await roseContract.balanceOf(signer.address);
      const updatedNativeBalance = await provider.getBalance(signer.address);
      const formattedUpdatedRoseBalance = ethers.formatEther(updatedRoseBalance);
      const formattedUpdatedNativeBalance = ethers.formatEther(updatedNativeBalance);
      return <>Received {(parseFloat(formattedUpdatedRoseBalance) - parseFloat(roseBalance)).toFixed(6)}🌹</>;
    } catch (error) {
      console.error("Error during buy:", error);
      let errorMessage = "An error occurred during the transaction.";
      
      if (error.reason) {
        errorMessage = error.reason;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Show the error in a popup
      showPopUp(errorMessage);
      
      return `Error during buy. Please try again.`;
    }
  };

  const sellCall = async (amount) => {
    const numericBalance = parseFloat(nativeBalance);
    const numericRoseBalance = parseFloat(roseBalance);
    if (amount > numericRoseBalance) {
      return `Insufficient funds. Current balance: ${numericRoseBalance.toFixed(6)}🌹`;
    }
    const numericReserve1 = parseFloat(reserve1);
    if (amount > numericReserve1) {
      return `Amount too large, can only sell up to 2% of the pool. Current reserve: ${numericReserve1.toFixed(6)}🌹`;
    }
    const roseContract = new ethers.Contract(
      rose,
      ['function transfer(address to, uint256 amount) returns (bool)'],
      signer
    );
    const tx = await roseContract.transfer(rose, ethers.parseUnits(amount.toString(), 18));
    await tx.wait();
    
    const updatedNativeBalance = await provider.getBalance(signer.address);
    const formattedUpdatedBalance = ethers.formatEther(updatedNativeBalance);
    
    return <>Received {(parseFloat(formattedUpdatedBalance) - numericBalance).toFixed(6)}<EthIcon /></>;
  };

  const transferCall = async (amount, recipient) => {
    const numericRoseBalance = parseFloat(roseBalance);
    if (amount > numericRoseBalance) {
      return `Insufficient funds. Current balance: ${numericRoseBalance.toFixed(6)}🌹`;
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
      return `New balance: ${(numericRoseBalance - amount).toFixed(6)}🌹`;
    } catch (error) {
      console.error("Error during transfer:", error);
      return `Error during transfer: ${error.message}`;
    }
  };

  const commands = {
    buy: (args) => {
      const amount = parseFloat(args[0]);
      if (isNaN(amount) || amount <= 0) {
        return `<pre>Invalid amount. Please enter a positive number.
            
    usage: buy &lt;amount&gt;
        </pre>
       `;
      }
      
      setAsyncOutput(<>Processing deposit of {amount} <EthIcon />...</>);

      animateLogo(async () => {
        const result = await buyCall(amount);
        setAsyncOutput(result);
      });

      return null;
    },
    sell: (args) => {
      const amount = parseFloat(args[0]);
      if (isNaN(amount) || amount <= 0) {
        return `<pre>Invalid amount. Please enter a positive number.

    usage: sell &lt;amount&gt;
        </pre>
       `;
      }
      
      setAsyncOutput(`Processing sale of ${amount}🌹...`);

      animateLogo(async () => {
        const result = await sellCall(amount);
        setAsyncOutput(result);
      });

      return null;
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
      
      setAsyncOutput(`Processing transfer of ${amount}🌹 to ${recipient}...`);

      animateLogo(async () => {
        const result = await transferCall(amount, recipient);
        setAsyncOutput(result);
      });

      return null;
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
        return <>Current balance: {numericBalance.toFixed(6)} <EthIcon /></>;
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
    snake: (args) => {
      if (args.length > 0) {
        return `<pre>snake does not take additional arguments.

    usage: snake
        </pre>
       `;
      }
      setShowSnakeGame(true);
      return 'Starting Snake game...';
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
      setShowTabCompletion(true);
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
        },
        (err) => {
          console.error('Failed to copy text: ', err);
        }
      );
    }
  };

  const renderGlitters = () => {
    const glitters = [];
    for (let i = 0; i < 20; i++) {
      glitters.push(
        <Glitter
          key={i}
          delay={Math.random()}
          top={Math.random() * 100}
          left={Math.random() * 100}
        />
      );
    }
    return glitters;
  };

  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  const handleContainerClick = (e) => {
    // Only focus the input if the click wasn't on the GitHub link
    if (!e.target.closest('a')) {
      inputRef.current.focus();
    }
  };

  return (
    <TerminalContainer onClick={handleContainerClick}>
      <GitHubLink 
        href="https://github.com/RedRoseMoney/Rose" 
        target="_blank" 
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}  // Prevent event from bubbling up
      >
        <FaGithub />
      </GitHubLink>
      {showIntro && (
        <Intro asciiLogo={asciiLogo} onIntroComplete={handleIntroComplete} />
      )}
      <AsciiArtWrapper>
        <AsciiArtContainer isAnimating={isAnimating}>{asciiLogo}</AsciiArtContainer>
        {isAnimating && (
          <GlitterContainer>
            {renderGlitters()}
          </GlitterContainer>
        )}
      </AsciiArtWrapper>
      <HelpContainer>
        <FaCircleInfo />
        <HelpContent>
          <HelpItem><HelpIcon>⇥</HelpIcon> to see options</HelpItem>
          <HelpItem><HelpIcon>↑</HelpIcon> to see historic commands</HelpItem>
          <HelpItem><HelpIcon>↵</HelpIcon> to run a command</HelpItem>
        </HelpContent>
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
              <OutputDiv>
                {typeof item.content === 'string' 
                  ? item.content.replace(/ETH/g, '<EthIcon />')
                  : item.content}
              </OutputDiv>
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
            disabled={showSnakeGame}
          />
          {showTabHint && <TabHint>press tab to see options</TabHint>}
        </InputContainer>
        {showTabCompletion && (
          <TabCompletion options={availableCommands} inputText={input} onSelect={handleTabCompletion} />
        )}
      </TerminalContent>
      <Chart data={chartData} />
      <BottomBar />
      {showSnakeGame && <SnakeGame onClose={() => setShowSnakeGame(false)} />}
    </TerminalContainer>
  );
};

export default Terminal;
