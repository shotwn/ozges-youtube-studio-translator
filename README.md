# Özge's Youtube Studio Translator

<div style="width: 100%; text-align: center">
  <picture style="width: 100%;>
    <img src="logo.png" style="width: 100%; max-width: 380px; margin: auto" />
  </picture>
  <br>
  <img src="https://img.shields.io/badge/vanilla-javascript-yellow" />
  <img src="https://img.shields.io/badge/old_school-hypertext-blue" />
  <img src="https://img.shields.io/badge/tempermonkey-v4.19.0+-orange" />
  <img src="https://img.shields.io/badge/translate_api-v2-green" />
  <img src="https://img.shields.io/badge/google_api_key-required-red" />
  <img src="https://img.shields.io/badge/chrome-v117+-green" />
</div>

## What is this?
This is a Tempermonkey script that translates the title and description of a video in Youtube Studio to a language of your choice. It uses Google Translate API to do the translation. It is useful if you are a Youtube content creator and want to translate your video titles and descriptions to other languages.

## How to Install Tempermonkey Script
1. Download latest version of script (tempermonkey-userscript.js) from [here](https://github.com/shotwn/Ozges-Youtube-Studio-Translator/releases/latest).
2. Install Tempermonkey extension for your browser from [here](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo).
3. Click on the Tempermonkey icon and select "Dashboard"
4. Click on the "Utilities" tab
5. Find "Import from File", click on "Choose File" and select the script file you downloaded in step 1.
6. Click on "Install" button.
7. Find GOOGLE_API_KEY config in the script and replace it with your own Google API key. You can get a Google API key by following the instructions [here](https://cloud.google.com/docs/authentication/api-keys).
   ```javascript 
   const GOOGLE_API_KEY = '<your-api-key>'; // Example: const GOOGLE_API_KEY = 'AIzaSyD-9VgTcZdYqZjrZsLuvL4Z9gqz5dKvHzE'
   ```
8. Save the script. You can do this by clicking on the "File" tab and selecting "Save".
9. Done! You can now use the script. You can check if it is working by going to [Youtube Studio](https://studio.youtube.com/) and clicking on any video. You should see translation boxes under the video title and description.

## Need it as a Chrome Extension?
If you want to use this script as a Chrome extension, please leave a request in the [issues](https://github.com/shotwn/Ozges-Youtube-Studio-Translator/issues) section.

## Screenshots
<div style="width: 100%; text-align: center">
  <img src="screenshots/sc1.png" style="width: 100%; max-width: 640px; margin: auto" />
</div>

### Credits
- Logo
  - Bing Chat with GPT-4
  - DALL-E
  - Slight touch of Photoshop
  - Microsoft Designer
- Name
  - I made it for my sister Özge, 🤷‍♂️.