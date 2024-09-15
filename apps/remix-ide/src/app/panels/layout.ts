import { Plugin } from '@remixproject/engine'
import { Profile } from '@remixproject/plugin-utils'
import { EventEmitter } from 'events'
import { QueryParams } from '@remix-project/remix-lib'

const profile: Profile = {
  name: 'layout',
  description: 'layout',
  methods: ['minimize', 'maximiseSidePanel', 'resetSidePanel', 'maximizeTerminal', 'maximisePinnedPanel', 'resetPinnedPanel']
}

interface panelState {
  active: boolean
  plugin: Plugin
  minimized: boolean
}
interface panels {
  tabs: panelState
  editor: panelState
  main: panelState
  terminal: panelState
}

export type PanelConfiguration = {
  minimizeterminal: boolean,
  minimizesidepanel: boolean,
  embed: boolean
}

export class Layout extends Plugin {
  event: any
  panels: panels
  maximised: { [key: string]: boolean }
  constructor () {
    super(profile)
    this.maximised = {}
    this.event = new EventEmitter()
  }

  async onActivation (): Promise<void> {
    this.on('fileManager', 'currentFileChanged', () => {
      this.panels.editor.active = true
      this.panels.main.active = false
      this.event.emit('change', null)
    })
    this.on('tabs', 'openFile', () => {
      this.panels.editor.active = true
      this.panels.main.active = false
      this.event.emit('change', null)
    })
    this.on('tabs', 'switchApp', (name: string) => {
      this.call('mainPanel', 'showContent', name)
      this.panels.editor.active = false
      this.panels.main.active = true
      this.event.emit('change', null)
    })
    this.on('tabs', 'closeApp', (name: string) => {
      this.panels.editor.active = true
      this.panels.main.active = false
      this.event.emit('change', null)
    })
    this.on('manager', 'activate', (profile: Profile) => {
      switch (profile.name) {
      case 'filePanel':
        this.call('menuicons', 'select', 'filePanel')
        break
      }
    })
    this.on('sidePanel', 'focusChanged', async (name) => {
      const current = await this.call('sidePanel', 'currentFocus')
      if (this.maximised[current]) {
        this.event.emit('maximisesidepanel')
      } else {
        this.event.emit('resetsidepanel')
      }
    })

    this.on('pinnedPanel', 'pinnedPlugin', async (name) => {
      const current = await this.call('pinnedPanel', 'currentFocus')
      if (this.maximised[current]) {
        this.event.emit('maximisepinnedpanel')
      } else {
        this.event.emit('resetpinnedpanel')
      }
    })

    document.addEventListener('keypress', e => {
      if (e.shiftKey && e.ctrlKey) {
        if (e.code === 'KeyF') {
          // Ctrl+Shift+F
          this.call('menuicons', 'select', 'filePanel')
        } else if (e.code === 'KeyA') {
          // Ctrl+Shift+A
          this.call('menuicons', 'select', 'pluginManager')
        }
        e.preventDefault()
      }
    })
    const queryParams = new QueryParams()
    const params = queryParams.get() as PanelConfiguration
    if (params.minimizeterminal || params.embed) {
      this.panels.terminal.minimized = true
      this.event.emit('change', this.panels)
      this.emit('change', this.panels)
    }
    if (params.minimizesidepanel || params.embed) {
      this.event.emit('minimizesidepanel')
    }
  }

  minimize (name: string, minimized:boolean): void {
    this.panels[name].minimized = minimized
    this.event.emit('change', this.panels)
    this.emit('change', this.panels)
  }

  async maximiseSidePanel () {
    this.event.emit('maximisesidepanel')
    const current = await this.call('sidePanel', 'currentFocus')
    this.maximised[current] = true
  }

  async maximisePinnedPanel () {
    this.event.emit('maximisepinnedpanel')
    const current = await this.call('pinnedPanel', 'currentFocus')
    this.maximised[current] = true
  }

  async maximizeTerminal() {
    this.panels.terminal.minimized = false
    this.event.emit('change', this.panels)
    this.emit('change', this.panels)
  }

  async resetSidePanel () {
    this.event.emit('resetsidepanel')
    const current = await this.call('sidePanel', 'currentFocus')
    this.maximised[current] = false
  }

  async resetPinnedPanel () {
    this.event.emit('resetpinnedpanel')
    const current = await this.call('pinnedPanel', 'currentFocus')
    this.maximised[current] = false
  }
}
