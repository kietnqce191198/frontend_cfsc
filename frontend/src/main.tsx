import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import 'bootstrap/dist/css/bootstrap.min.css'
import "./assets/style.css";
import "./assets/style.scss";
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)