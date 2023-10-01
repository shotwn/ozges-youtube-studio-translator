// ==UserScript==
// @name         Özge's Youtube Translator - Development
// @namespace    https://anilhaksever.com
// @version      0.0.1
// @description  Translates description and title of videos in Youtube Studio using Google Translate API
// @author       shotwn
// @match        https://studio.youtube.com/**
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// @grant        GM.xmlHttpRequest
// @grant        GM.setValue
// @grant        GM.getValue
// @connect      translation.googleapis.com
// @supportURL   https://github.com/shotwn/Ozges-Youtube-Studio-Translator/issues
// @require      file://D:\Works Sync\Dev\input-translator\src\supported-languages.js
// @require      file://D:\Works Sync\Dev\input-translator\src\main.js
// ==/UserScript==

// Change the path to your local src folder in require statements.

// We ignore config.js and use the following snippet instead:
const GOOGLE_API_KEY = '<your-api-key>' // Example: const GOOGLE_API_KEY = 'AIzaSyD-9VgTcZdYqZjrZsLuvL4Z9gqz5dKvHzE'