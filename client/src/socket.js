import { io } from 'socket.io-client';
import { API_URL } from './config.js';

// One shared socket for the app. Listeners are attached in components' effects.
export const socket = io(API_URL, { autoConnect: true });
