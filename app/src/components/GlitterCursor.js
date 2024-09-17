import React, { useState, useEffect } from 'react';
import styled, { createGlobalStyle, keyframes } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  body, div, span, a, button {
    cursor: none !important;
  }

  input, textarea, [contenteditable] {
    cursor: none !important;
  }
`;

const pulse = keyframes`
  0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.8; }
  100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
`;

const clickEffect = keyframes`
  0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(0.6); opacity: 0.6; }
`;

const CursorContainer = styled.div`
  position: fixed;
  pointer-events: none;
  z-index: 9999;
  transition: opacity 0.3s ease;
  transform: translate(-50%, -50%);
`;

const CursorDot = styled.div`
  width: 5px;
  height: 5px;
  background-color: #00ffff;
  border-radius: 50%;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 5px #00ffff, 0 0 10px #00ffff, 0 0 15px #00ffff;
  animation: ${pulse} 1.5s infinite;
  transition: all 0.3s ease;

  &.clicked {
    animation: ${clickEffect} 0.2s forwards;
    box-shadow: 0 0 10px #00ffff, 0 0 20px #00ffff, 0 0 30px #00ffff;
  }
`;

const GlitterCursor = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isClicked, setIsClicked] = useState(false);

  useEffect(() => {
    const updatePosition = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseDown = () => setIsClicked(true);
    const handleMouseUp = () => setIsClicked(false);

    window.addEventListener('mousemove', updatePosition);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', updatePosition);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <>
      <GlobalStyle />
      <CursorContainer style={{ 
        left: position.x, 
        top: position.y
      }}>
        <CursorDot className={isClicked ? 'clicked' : ''} />
      </CursorContainer>
    </>
  );
};

export default GlitterCursor;
