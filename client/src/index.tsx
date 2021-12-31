import 'bootstrap/dist/css/bootstrap.min.css';
import * as serviceWorker from 'serviceWorker';
import { configureStore, getDefaultMiddleware } from '@reduxjs/toolkit';
import App from './App';
import { Provider } from 'react-redux';
import React from 'react';
import ReactDOM from 'react-dom';
import { ethers } from 'ethers';
import rootReducer from 'features';
import socketMiddleware from 'middleware/socket';

const CLOUD_URL = `https://${process.env.REACT_APP_CLOUDFRONT}`;
declare const window: any; // eslint-disable-line

const store = configureStore({
  reducer: rootReducer,
  middleware: [...getDefaultMiddleware({ immutableCheck: false, serializableCheck: false }), socketMiddleware]
});

const provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
const Web3Context = React.createContext(provider);

ReactDOM.render(
  <Provider store={store}>
    <Web3Context.Provider value={provider}>
      <App />
    </Web3Context.Provider>
  </Provider>,
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();

export { CLOUD_URL, Web3Context };
export type RootState = ReturnType<typeof store.getState>;
