// Required to inject HTML after sanitation
// https://developer.mozilla.org/en-US/docs/Web/API/TrustedTypePolicyFactory/createPolicy
if (window.trustedTypes && window.trustedTypes.createPolicy) {
  window.trustedTypes.createPolicy('default', {
    createHTML: (string, sink) => string
  });
}

/**
* Centralized debug.
*/
function logDebug (message) {
  console.log('OYT: ', message)
}

/**
 * Class for translating input elements.
 */
class InputTranslator {
  /**
   * 
   * @param {*} options 
   * @param {string} options.inputSelector - CSS selector for input element.
   * @param {number} options.debounce - How long to wait after last input and before translation request.
   * @throws Error
   */
  constructor (googleApiKey, options) {
    this.options = {
      inputSelector: null,
      debounce: 1000,
      renderToParentElementDepth: 4,
      elementDataGetter: element => element.innerHTML,
      defaultFromLanguage: 'auto',
      defaultToLanguage: 'tr',
      autoLanguageLabel: 'Detect Language',
      alertElementWrapper: null,
      ...options
    }



    this.googleApiKey = googleApiKey
    if (!this.googleApiKey) {
      throw Error('Google API key is not defined.')
    }

    // Runtime variables
    this.inputElement = null
    this.outputElement = null
    this.cuedTranslationTimeout = null
    this.isInitiated = false
    this.loadingIsShown = false
    this.fromLanguage = this.options.defaultFromLanguage // Overridden by persistent config if available in init.
    this.toLanguage =  this.options.defaultToLanguage // Overridden by persistent config if available in init.
    this.fromLanguageSelector = null
    this.toLanguageSelector = null
    this.autoLanguageOptionElement = null

    this.init()
  }

  /**
   * Fetch input element from DOM.
   * @throws Error
   */
  async fetchInputElement () {
    if (!this.options.inputSelector) {
      throw Error('Input selector is not defined.')
    }

    this.inputElement = document.querySelector(this.options.inputSelector)
    if (!this.inputElement) {
      throw Error(`Input element not found. Selector: ${this.options.inputSelector}`)
    }
  }

  /**
   * Get n times parent element of given element.
   * @param {HTMLElement} element
   * @param {number} n
   * @returns {HTMLElement}
   */
  getNthParentElement (element, n) {
    let parentElement = element
    for (let i = 0; i < n; i++) {
      parentElement = parentElement.parentElement
    }

    return parentElement
  }

  /**
   * Set persistent config value.
   * Depends on alertElementWrapper option.
   * @param {String} key 
   * @param {any} value 
   * @returns {Promise<string, undefined>} Returns undefined if persistanceId is not defined.
   */
  async setPersistentConfig (key, value) {
    if (!this.options.persistanceId) {
      return
    }
    return await GM.setValue(`OYT-${this.options.persistanceId}-${key}`, value)
  }

  /**
   * Get persistent config value.
   * Depends on persistanceId option.
   * @param {String} key 
   * @returns {Promise<string, undefined>} Returns undefined if persistanceId is not defined or value is not found.
   */
  async getPersistentConfig (key) {
    if (!this.options.persistanceId) {
      return
    }
    return await GM.getValue(`OYT-${this.options.persistanceId}-${key}`)
  }

  /**
   * Creates a select element for supported languages. Used for language selectors.
   * @param {Function} onchange Function to call on change.
   * @param {String} selectedLanguageCode Selected language code. ISO 2 letter code.
   * @param {Boolean} pushAutoDetect Whether to push auto detect option to the top of the list.
   * @returns 
   */
  createSelectForSupportedLanguages (onchange, selectedLanguageCode, pushAutoDetect = false) {
    const select = document.createElement('select')
    const languages = googleTranslateSupportedLanguages.text

    if (pushAutoDetect) {
      const option = document.createElement('option')
      option.value = 'auto'
      option.innerHTML = this.options.autoLanguageLabel
      if (selectedLanguageCode === 'auto') {
        option.selected = true
      }

      // Save auto language option element for later use.
      this.autoLanguageOptionElement = option

      select.appendChild(option)
    }

    for (const language of languages) {
      const option = document.createElement('option')
      option.value = language.code
      option.innerHTML = language.language
      if (language.code === selectedLanguageCode) {
        option.selected = true
      }
      select.appendChild(option)
    }

    select.onchange = onchange.bind(this)

    return select
  }

  /**
   * Create output element in DOM.
   * Old school DOM manipulation is used because of:
   * 1. YouTube's strict CSP.
   * 2. Lightweight and fast.
   * 3. And because it is fun.
   * @throws Error
   */
  async createOutputElement () {
    // Most outer wrapper
    const outputWrapper = document.createElement('div')

    // Top wrapper
    const languageSelectorsWrapper = document.createElement('div')
    languageSelectorsWrapper.style = 'display: flex; justify-content: center;'

    // Output label
    const outputLabel = document.createElement('label')
    outputLabel.innerHTML = 'Translation'
    outputLabel.style = [
      'font-family: "Roboto","Noto",sans-serif',
      ' font-weight: 400',
      ' font-size: 12px',
      ' color: var(--ytcp-text-secondary)',
      ' padding-bottom: 5px',
      ' display: block'
    ].join(';')

    // Language selectors
    const langSelectorStyle = [
      'background-color: var(--ytcp-brand-background-solid)',
      'color: var(--ytcp-text-primary)',
      'border-radius: 5px',
      'margin-top: -3px'
    ].join(';')

    const languageSelectorLabel = document.createElement('label')
    languageSelectorLabel.innerHTML = 'Select Translator Language'
    languageSelectorLabel.style = [
      'font-family: "Roboto","Noto",sans-serif',
      ' font-weight: 400',
      ' font-size: 12px',
      ' color: var(--ytcp-text-secondary)',
      ' padding-top: 5px',
      ' padding-bottom: 10px',
      ' display: block'
    ].join(';')

    this.fromLanguageSelector = this.createSelectForSupportedLanguages(event => {
      this.fromLanguage = event.target.value
      this.setPersistentConfig('fromLanguage', this.fromLanguage)
      this.doTranslation()
    }, this.fromLanguage, true)
    this.fromLanguageSelector.style = langSelectorStyle

    const arrow = document.createElement('div')
    arrow.innerHTML = '➤'
    arrow.style = 'font-size: 16px; margin: 0px 10px 6px 10px;'

    this.toLanguageSelector = this.createSelectForSupportedLanguages(event => {
      this.toLanguage = event.target.value
      this.setPersistentConfig('toLanguage', this.toLanguage)
      this.doTranslation()
    }, this.toLanguage)
    this.toLanguageSelector.style = langSelectorStyle

    // Append top wrapper children
    languageSelectorsWrapper.appendChild(this.fromLanguageSelector)
    languageSelectorsWrapper.appendChild(arrow)
    languageSelectorsWrapper.appendChild(this.toLanguageSelector)

    // Output element
    this.outputElement = document.createElement('div')
    this.outputElement.innerHTML = 'Initiation...'
    this.outputElement.style = [
      'font-family: "Roboto","Noto",sans-serif',
      ' font-weight: 400',
      ' font-size: 14px',
      ' color: var(--ytcp-text-primary)',
      ' padding-bottom: 5px',
    ].join(';')
    
    // Append output wrapper children
    outputWrapper.appendChild(outputLabel)
    outputWrapper.appendChild(this.outputElement)
    outputWrapper.appendChild(languageSelectorLabel)
    outputWrapper.appendChild(languageSelectorsWrapper)

    // Append output wrapper to DOM
    this.getNthParentElement(this.inputElement, this.options.renderToParentElementDepth).appendChild(outputWrapper)
  }

  /**
   * Bind input events.
   * @throws Error
   */
  async bindInputEvents () {
    this.inputElement.oninput = this.debounceTranslation.bind(this)
  }

  /**
   * Debounce translation request.
   * Prevents making a request on every key stroke.
   * @throws Error
   */
  async debounceTranslation () {
    if (this.cuedTranslationTimeout) {
      /*
      There is already a cued translation. Cancel timeout.
      If request already started we let it run. Debounce is not mission critical.
      So no need for having a different XHR check.
      */
      clearTimeout(this.cuedTranslationTimeout)
    }

    // Show loading
    if (!this.loadingIsShown) {
      this.outputElement.innerHTML += ' ⏳'
      this.loadingIsShown = true
    }

    // Cue the request with a debounce
    this.cuedTranslationTimeout = setTimeout(() => {this.doTranslation()}, this.options.debounce)
  }

  /**
   * Make translation request.
   * @param {String} toTranslate 
   * @returns {Promise<String>} Translated text.
   */
  translationRequest (toTranslate) {
    return new Promise((resolve, reject) => {
      const data = {
        q: toTranslate,
        target: this.toLanguage,
        format: 'text', // We need text to preserve new lines in YouTube's input.
        // Do not send source language if it is auto.
        source: this.fromLanguage === 'auto' ? undefined : this.fromLanguage,
      }

      // Bind auto language option element to be available in translation request.
      const autoLanguageOptionElement = this.autoLanguageOptionElement
      const autoLanguageLabel = this.options.autoLanguageLabel

      GM.xmlHttpRequest({
        method: "POST",
        url: 'https://translation.googleapis.com/language/translate/v2',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': this.googleApiKey
        },
        data: JSON.stringify(data),
        onload: function(response) {
          // Check response status
          if (response.status !== 200) {
            // Default error message
            let message = `Request failed. Status: ${response.status}`

            // Try to get error message from response
            const failedResponseJSON = JSON.parse(response.responseText)
            if (failedResponseJSON?.error?.message) {
              message = ` Reason: ${failedResponseJSON.error.message}`
            }

            reject(message)
            return
          }

          // Decode response JSON
          const responseJSON = JSON.parse(response.responseText)

          // Check if translation found
          if (!responseJSON?.data?.translations?.[0]) {
            reject('No translation found.')
            return
          }

          // Update auto language option element
          if (responseJSON?.data?.translations?.[0]?.detectedSourceLanguage && autoLanguageOptionElement) {
            // Find language name from code
            const detectedLanguage = responseJSON.data.translations[0].detectedSourceLanguage
            const languageName = googleTranslateSupportedLanguages.text.find(
              language => language.code === detectedLanguage
            )?.language || detectedLanguage
            
            // Update auto language option element
            autoLanguageOptionElement.innerHTML = `Detected: ${languageName}`
          } else if (autoLanguageOptionElement) {
            // Update auto language option element to default
            autoLanguageOptionElement.innerHTML = autoLanguageLabel
          }

          // Resolve with translated text
          resolve(responseJSON.data.translations[0].translatedText)
        },
        onerror: function(err) {
          unsafeWindow.alert('Error while translating. Check console for details.')
          reject(err)
        }
      });
    })
  }

  /**
   * Prepare translation request, fire it and update output element.
   */
  async doTranslation () {
    // Get content to translate
    const toTranslate = this.options.elementDataGetter(this.inputElement)

    // Default translated text
    let translated = '🤷‍♂️ Waiting for content to translate...'

    // Make translation request
    if (toTranslate && toTranslate !== '') {
      try {
        translated = await this.translationRequest(toTranslate)
        
      } catch (err) {
        this.showAlertMessage(err)
      }
    }
    
    // Update output element
    // Replace new lines with <br> for better readability in HTML.
    this.outputElement.innerHTML = translated ? translated.replace(/(?:\r\n|\r|\n)/g, '<br>') : '🤷‍♂️ No translation found.'

    // Since we had overridden the output, mark loading indicator emoji hidden
    this.loadingIsShown = false
  }

  /**
   * Inserts a div in body to show an alert.
   * Div is reused if already created.
   */
  showAlertMessage (message) {
    let alertModalElement = document.getElementById('oyt-alert')
    if (!alertModalElement) {
      alertModalElement = document.createElement('div')
      alertModalElement.id = 'oyt-alert'
      alertModalElement.style = [
        'position: fixed',
        'top: 0px',
        'left: 0px',
        'width: 100%',
        'height: 100%',
        'background-color: rgba(0,0,0,0.8)',
        'z-index:100'
      ].join(';')

      const alertElementWrapper = document.createElement('div')
      alertElementWrapper.id = 'oyt-alert-wrapper'
      alertElementWrapper.style = [
        'position: absolute',
        'top: 50%',
        'left: 50%',
        'transform: translate(-50%, -50%)',
        'background-color: var(--ytcp-brand-background-solid)',
        'color: var(--ytcp-text-primary)',
        'font-family: "Roboto","Noto",sans-serif',
        'font-size: 14px',
        'padding: 20px',
        'border-radius: 5px',
        'min-width: 360px',
        'height: 300px',
        'overflow: auto'
      ].join(';')

      const alertElementTitle = document.createElement('div')
      alertElementTitle.innerHTML = 'OYT Translation Error'
      alertElementTitle.style = [
        'font-size: 18px',
        'font-weight: 500',
        'padding-bottom: 10px'
      ].join(';')

      const alertElementDescription = document.createElement('div')
      alertElementDescription.innerHTML = 'An error occurred while translating. Check console for further details.'
      alertElementDescription.style = [
        'padding-bottom: 10px'
      ].join(';')

      const alertElementCloseButton = document.createElement('button')
      alertElementCloseButton.innerHTML = '❌'
      alertElementCloseButton.style = [
        'position: absolute',
        'top: 10px',
        'right: 10px',
        'background-color: var(--ytcp-general-background-a)',
        'color: var(--ytcp-text-primary)',
        'font-size: 14px',
        'padding: 5px',
        'border-radius: 50%',
        'border: none',
        'cursor: pointer'
      ].join(';')
      alertElementCloseButton.title = 'Close'
      alertElementCloseButton.addEventListener('click', () => {
        console.log('close')
        alertModalElement.style.display = 'none'
      })

      const alertElementMessages = document.createElement('div')
      alertElementMessages.id = 'oyt-alert-messages'
      alertElementMessages.style = [
        'height: 80%',
        'overflow: auto'
      ].join(';')
      alertElementMessages.innerHTML = '<span style="font-weight: 500">Error Log:</span><br>'

      alertElementWrapper.appendChild(alertElementTitle)
      alertElementWrapper.appendChild(alertElementCloseButton)
      alertElementWrapper.appendChild(alertElementDescription)
      alertElementWrapper.appendChild(alertElementMessages)
      alertModalElement.appendChild(alertElementWrapper)

      document.body.appendChild(alertModalElement)
    }

    const alertElementWrapper = alertModalElement.querySelector('#oyt-alert-messages')
    const timestamp = new Date().toLocaleTimeString()
    alertElementWrapper.innerHTML += `<div>${timestamp}-> ${message}</div>`
    alertModalElement.style.display = 'block'
  }

  /**
   * Remember persistent runtime values.
   * Depends on persistanceId option.
   * Important to call this before creating output and select elements.
  */
  async rememberPersistentRuntimeValues () {
    // Get persistent config values
    const fromLanguage = await this.getPersistentConfig('fromLanguage')
    const toLanguage = await this.getPersistentConfig('toLanguage')

    // Update runtime values
    if (fromLanguage) {
      this.fromLanguage = fromLanguage
    }

    if (toLanguage) {
      this.toLanguage = toLanguage
    }
  }

  /**
   * Initialize the translator.
   */
  async init (retryCount = 0) {
    if (retryCount > 10) {
      throw Error('Failed to initialize after 10 tries.')
    }

    try {
      await this.fetchInputElement()
      await this.rememberPersistentRuntimeValues()
      await this.createOutputElement()
      await this.bindInputEvents()

      // Do a translation request to fill the output element with something.
      // Timeout is required because the input element is not ready yet.
      setTimeout(() => {this.doTranslation()}, 200)
      this.isInitiated = true
    } catch (err) {
      if (retryCount === 9) { // Last try
        logDebug(err)
      }
      setTimeout ( () => { this.init(retryCount + 1) }, 1000)
    }
  }
}

/**
* Start main program logic.
*/
async function bindElements () {
  const titleTranslator = new InputTranslator(GOOGLE_API_KEY, {
    inputSelector: 'div .style-scope .ytcp-social-suggestions-textbox #textbox',
    persistanceId: 'title'
  })

  const descriptionTranslator = new InputTranslator(GOOGLE_API_KEY, {
    inputSelector: '#description-textarea .style-scope .ytcp-social-suggestions-textbox #textbox',
    persistanceId: 'description'
  })
}



(function() {
  'use strict';
  if (window.top !== window.self) {
    logDebug('In an iframe. Skipping.')
    return
  }

  // Make sure when YouTube re-renders the page due navigation we re-bind the elements.
  let currentPage = null
  setInterval(() => {
    if (currentPage !== window.location.href) {
      // Make sure page URL fits our pattern.
      if (window.location.href.match(/https:\/\/studio\.youtube\.com\/video\/(.*)+\/edit/)) {
        bindElements()
      }
      
      // Update current page, so we don't re-bind elements.
      currentPage = window.location.href
    }
  }, 1000)

  logDebug('Translator initiated.')
})();
