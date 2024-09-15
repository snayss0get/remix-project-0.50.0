import { NightwatchBrowser, NightwatchCheckVariableDebugValue } from 'nightwatch'
import EventEmitter from 'events'

const deepequal = require('deep-equal')

class CheckVariableDebug extends EventEmitter {
  command(this: NightwatchBrowser, id: string, debugValue: NightwatchCheckVariableDebugValue): NightwatchBrowser {
    this.api.perform((done) => {
      checkDebug(this.api, id, debugValue, () => {
        done()
        this.emit('complete')
      })
    })
    return this
  }
}

function checkDebug(browser: NightwatchBrowser, id: string, debugValue: NightwatchCheckVariableDebugValue, done: VoidFunction) {
  // id is soliditylocals or soliditystate
  let resultOfElement = null
  let isEqual = false
  // waitUntil will run with intervals of 1000ms for 10 seconds until the condition is met
  browser.waitUntil(() => {
    browser.execute(function (id: string) {
      const elem = document.querySelector('#' + id + ' .dropdownrawcontent') as HTMLElement
      if (elem && elem.innerText) {
        return elem.innerText
      }
    }, [id], (result) => {
      if (result.value) {
        try {
          resultOfElement = JSON.parse(<string>result.value)
          isEqual = deepequal(debugValue, resultOfElement)
        } catch (e) {
          browser.assert.fail('cant parse solidity state', e.message, '')
        }
      }
    })
    if (isEqual) return true
    return false
  }, 10000, 1000)
    .perform(() => {
      if (!isEqual) {
        browser.assert.fail(JSON.stringify(resultOfElement), 'info about error\n ' + JSON.stringify(debugValue) + '\n ' + JSON.stringify(resultOfElement), '')
      }
      done()
    })
}

module.exports = CheckVariableDebug
