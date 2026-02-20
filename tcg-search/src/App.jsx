import React from 'react';
import { Routes, Route } from "react-router-dom"
import Search from "./components/Search"

import './App.css';

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={ <Search/> } />
      </Routes>
    </div>
  );
}

export default App
