import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { usePopUp } from '../contexts/PopUpContext';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const GameContainer = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.8);
  border-radius: 15px;
  padding: 20px;
  z-index: 1000;
  box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
  animation: ${fadeIn} 0.3s ease-out;
`;

const GameBoard = styled.canvas`
  border-radius: 10px;
  box-shadow: 0 0 10px rgba(0, 255, 0, 0.2);
`;

const ScoreDisplay = styled.div`
  color: #00ff00;
  font-family: 'Courier New', monospace;
  font-size: 18px;
  margin-bottom: 15px;
  text-shadow: 0 0 5px rgba(0, 255, 0, 0.5);
`;

const CloseButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  color: #00ff00;
  cursor: pointer;
  font-size: 20px;
  transition: transform 0.2s ease-in-out;

  &:hover {
    transform: scale(1.1);
  }
`;

const CELL_SIZE = 15;
const BOARD_WIDTH = 40;
const BOARD_HEIGHT = 30;

const SnakeGame = ({ onClose }) => {
  const [snake, setSnake] = useState([{ x: 20, y: 15 }]);
  const [food, setFood] = useState({ x: 10, y: 10 });
  const [direction, setDirection] = useState('RIGHT');
  const [score, setScore] = useState(0);
  const canvasRef = useRef(null);
  const { showPopUp } = usePopUp();

  const moveSnake = useCallback(() => {
    setSnake(prevSnake => {
      const newSnake = [...prevSnake];
      const head = { ...newSnake[0] };

      switch (direction) {
        case 'UP': head.y -= 1; break;
        case 'DOWN': head.y += 1; break;
        case 'LEFT': head.x -= 1; break;
        case 'RIGHT': head.x += 1; break;
        default: break;
      }

      if (head.x === food.x && head.y === food.y) {
        setScore(prevScore => prevScore + 1);
        setFood({
          x: Math.floor(Math.random() * BOARD_WIDTH),
          y: Math.floor(Math.random() * BOARD_HEIGHT)
        });
      } else {
        newSnake.pop();
      }

      if (head.x < 0 || head.x >= BOARD_WIDTH || head.y < 0 || head.y >= BOARD_HEIGHT ||
          newSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
        showPopUp(`Game Over! Your score: ${score}`);
        onClose();
        return [{ x: 20, y: 15 }];
      }

      return [head, ...newSnake];
    });
  }, [direction, food, score, showPopUp, onClose]);

  const drawGame = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw snake
    ctx.fillStyle = '#00ff00';
    snake.forEach((segment, index) => {
      const radius = CELL_SIZE / 2 - (index === 0 ? 1 : 2);
      ctx.beginPath();
      ctx.arc(segment.x * CELL_SIZE + CELL_SIZE / 2, segment.y * CELL_SIZE + CELL_SIZE / 2, radius, 0, 2 * Math.PI);
      ctx.fill();

      // Add glow effect
      ctx.shadowColor = '#00ff00';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;
    });

    // Draw food
    ctx.fillStyle = '#ff3860';
    ctx.beginPath();
    ctx.arc(food.x * CELL_SIZE + CELL_SIZE / 2, food.y * CELL_SIZE + CELL_SIZE / 2, CELL_SIZE / 2 - 1, 0, 2 * Math.PI);
    ctx.fill();

    // Add glow effect to food
    ctx.shadowColor = '#ff3860';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, [snake, food]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      switch (e.key) {
        case 'ArrowUp': setDirection(prev => prev !== 'DOWN' ? 'UP' : prev); break;
        case 'ArrowDown': setDirection(prev => prev !== 'UP' ? 'DOWN' : prev); break;
        case 'ArrowLeft': setDirection(prev => prev !== 'RIGHT' ? 'LEFT' : prev); break;
        case 'ArrowRight': setDirection(prev => prev !== 'LEFT' ? 'RIGHT' : prev); break;
        default: break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    const gameInterval = setInterval(() => {
      moveSnake();
      drawGame();
    }, 100);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      clearInterval(gameInterval);
    };
  }, [moveSnake, drawGame]);

  return (
    <GameContainer>
      <CloseButton onClick={onClose}>&times;</CloseButton>
      <ScoreDisplay>Score: {score}</ScoreDisplay>
      <GameBoard 
        ref={canvasRef} 
        width={BOARD_WIDTH * CELL_SIZE} 
        height={BOARD_HEIGHT * CELL_SIZE}
      />
    </GameContainer>
  );
};

export default SnakeGame;
