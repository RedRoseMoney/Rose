import React, { createContext, useState, useContext, useCallback } from 'react';
import PopUp from '../components/PopUp';

const PopUpContext = createContext();

export function PopUpProvider({ children }) {
  const [popUpMessage, setPopUpMessage] = useState(null);
  const [popUpKey, setPopUpKey] = useState(0);

  const showPopUp = useCallback((message) => {
    setPopUpMessage(message);
    setPopUpKey(prevKey => prevKey + 1);
  }, []);

  const hidePopUp = useCallback(() => {
    setPopUpMessage(null);
  }, []);

  return (
    <PopUpContext.Provider value={{ showPopUp }}>
      {children}
      {popUpMessage && (
        <PopUp 
          key={popUpKey} 
          message={popUpMessage} 
          onClose={hidePopUp} 
        />
      )}
    </PopUpContext.Provider>
  );
}

export function usePopUp() {
  return useContext(PopUpContext);
}
