import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';

const TabCompletionContainer = styled.div`
  background-color: rgba(42, 42, 42, 0.8);
  border-radius: 4px;
  padding: 8px;
  margin-top: 2px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  outline: none; /* Remove focus outline */
`;

const CompletionList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const CompletionItem = styled.div`
  padding: 4px 8px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s ease;
  outline: none; /* Remove focus outline */

  &:hover, &.selected {
    background-color: rgba(255, 255, 255, 0.1);
  }
`;

const TabCompletion = ({ options, inputText, onSelect }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef(null);

  const filteredOptions = options.filter(option =>
    option.toLowerCase().startsWith(inputText.toLowerCase())
  );

  useEffect(() => {
    containerRef.current?.focus();
  }, [filteredOptions]);

  const handleKeyDown = (e) => {
    const columns = Math.floor(containerRef.current.clientWidth / 130);
    const rows = Math.ceil(filteredOptions.length / columns);

    if (e.key === 'Tab') {
      e.preventDefault();
      setSelectedIndex((prevIndex) => (prevIndex + 1) % filteredOptions.length);
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSelectedIndex((prevIndex) => (prevIndex + 1) % filteredOptions.length);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSelectedIndex((prevIndex) => (prevIndex - 1 + filteredOptions.length) % filteredOptions.length);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prevIndex) => {
        const nextIndex = prevIndex + columns;
        return nextIndex < filteredOptions.length ? nextIndex : prevIndex % columns;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prevIndex) => {
        const nextIndex = prevIndex - columns;
        return nextIndex >= 0 ? nextIndex : prevIndex + (rows - 1) * columns;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onSelect(filteredOptions[selectedIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onSelect('');
    } else if (e.key === 'q') {
      e.preventDefault();
      onSelect('');
    }
  };

  return (
    <TabCompletionContainer onKeyDown={handleKeyDown} tabIndex="0" ref={containerRef}>
      <CompletionList>
        {filteredOptions.map((option, index) => (
          <CompletionItem
            key={option}
            className={index === selectedIndex ? 'selected' : ''}
            onClick={() => onSelect(option)}
          >
            {option}
          </CompletionItem>
        ))}
      </CompletionList>
    </TabCompletionContainer>
  );
};

export default TabCompletion;
