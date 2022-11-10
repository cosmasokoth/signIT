import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

window.onload = function () {
    setTimeout(function () {

        alert('5 minutes later, ready to initialize');

        ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
            <React.StrictMode>
                <App/>
            </React.StrictMode>
        );

    }, 5 * 60 * 1000);
};