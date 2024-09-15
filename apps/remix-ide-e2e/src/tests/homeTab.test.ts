'use strict'
import { NightwatchBrowser } from 'nightwatch'
import init from '../helpers/init'

module.exports = {

  before: function (browser: NightwatchBrowser, done: VoidFunction) {
    init(browser, done)
  },

  'Should start coding': function (browser: NightwatchBrowser) {
    browser
      .waitForElementVisible('*[data-id="homeTabStartCoding"]')
      .click('*[data-id="homeTabStartCoding"]')
      .waitForElementVisible('div[data-id="treeViewDivtreeViewItemcontracts/HelloWorld.sol"]')
  }
}