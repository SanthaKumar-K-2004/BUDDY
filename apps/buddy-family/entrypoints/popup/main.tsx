import { render } from 'preact';
import { App } from './App.js';

const container = document.getElementById('app');
if (container) {
  render(<App />, container);
}
