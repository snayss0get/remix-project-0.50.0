import React, {useEffect, useReducer, useState} from 'react'
import {RenderIf} from '@remix-ui/helper'
import {IntlProvider} from 'react-intl'

import { Container } from './components/container'
import {CircuitAppContext} from './contexts'
import {appInitialState, appReducer} from './reducers/state'
import {CircomPluginClient} from './services/circomPluginClient'
import { compileCircuit } from './actions'

const plugin = new CircomPluginClient()

function App() {
  const [appState, dispatch] = useReducer(appReducer, appInitialState)
  const [locale, setLocale] = useState<{code: string; messages: any}>({
    code: 'en',
    messages: null
  })
  const [isContentChanged, setIsContentChanged] = useState<boolean>(false)
  const [isPluginActivated, setIsPluginActivated] = useState<boolean>(false)

  useEffect(() => {
    plugin.internalEvents.on('circom_activated', () => {
      // @ts-ignore
      plugin.on('locale', 'localeChanged', (locale: any) => {
        setLocale(locale)
      })
      plugin.on('fileManager', 'currentFileChanged', (filePath) => {
        if (filePath.endsWith('.circom')) {
          dispatch({ type: 'SET_FILE_PATH', payload: filePath })
          plugin.parse(filePath)
        }
      })
      // @ts-ignore
      plugin.on('editor', 'contentChanged', async (path: string, content: string) => {
        setIsContentChanged(true)
        if (path.endsWith('.circom')) {
          plugin.parse(path, content)
        }
      })
      setIsPluginActivated(true)
    })

    // compiling events
    plugin.internalEvents.on('circuit_compiling_start', () => dispatch({ type: 'SET_COMPILER_STATUS', payload: 'compiling' }))
    plugin.internalEvents.on('circuit_compiling_done', (signalInputs: string[]) => {
      signalInputs = (signalInputs || []).filter(input => input)
      dispatch({ type: 'SET_SIGNAL_INPUTS', payload: signalInputs })
      dispatch({ type: 'SET_COMPILER_STATUS', payload: 'idle' })
    })
    plugin.internalEvents.on('circuit_compiling_errored', compilerErrored)

    // r1cs events
    plugin.internalEvents.on('circuit_generating_r1cs_start', () => dispatch({ type: 'SET_COMPILER_STATUS', payload: 'generating' }))
    plugin.internalEvents.on('circuit_generating_r1cs_done', () => dispatch({ type: 'SET_COMPILER_STATUS', payload: 'idle' }))
    plugin.internalEvents.on('circuit_generating_r1cs_errored', compilerErrored)

    // witness events
    plugin.internalEvents.on('circuit_computing_witness_start', () => dispatch({ type: 'SET_COMPILER_STATUS', payload: 'computing' }))
    plugin.internalEvents.on('circuit_computing_witness_done', () => {
      dispatch({ type: 'SET_COMPILER_STATUS', payload: 'idle' })
      dispatch({ type: 'SET_COMPILER_FEEDBACK', payload: null })
    })
    plugin.internalEvents.on('circuit_computing_witness_errored', compilerErrored)

    // parsing events
    plugin.internalEvents.on('circuit_parsing_done', (_, filePathToId) => {
      dispatch({ type: 'SET_FILE_PATH_TO_ID', payload: filePathToId })
      dispatch({ type: 'SET_COMPILER_FEEDBACK', payload: null })
    })
    plugin.internalEvents.on('circuit_parsing_errored', (report, filePathToId) => {
      dispatch({ type: 'SET_FILE_PATH_TO_ID', payload: filePathToId })
      dispatch({ type: 'SET_COMPILER_STATUS', payload: 'errored' })
      dispatch({ type: 'SET_COMPILER_FEEDBACK', payload: report })
    })
    plugin.internalEvents.on('circuit_parsing_warning', (report, filePathToId) => {
      dispatch({ type: 'SET_FILE_PATH_TO_ID', payload: filePathToId })
      dispatch({ type: 'SET_COMPILER_STATUS', payload: 'warning' })
      dispatch({ type: 'SET_COMPILER_FEEDBACK', payload: report })
    })
  }, [])

  useEffect(() => {
    if (isContentChanged) {
      (async () => {
        if (appState.autoCompile) await compileCircuit(plugin, appState)
      })()
      setIsContentChanged(false)
    }
  }, [appState.autoCompile, isContentChanged])

  useEffect(() => {
    if (isPluginActivated) {
      setCurrentLocale()
    }
  }, [isPluginActivated])

  useEffect(() => {
    if (appState.filePath) {
      (async () => {
        if (appState.autoCompile) await compileCircuit(plugin, appState)
      })()
      dispatch({ type: 'SET_SIGNAL_INPUTS', payload: [] })
      dispatch({ type: 'SET_COMPILER_STATUS', payload: 'idle' })
      dispatch({ type: 'SET_COMPILER_FEEDBACK', payload: null })
    }
  }, [appState.filePath])

  const setCurrentLocale = async () => {
    // @ts-ignore
    const currentLocale = await plugin.call('locale', 'currentLocale')

    setLocale(currentLocale)
  }

  const compilerErrored = (err: ErrorEvent) => {
    dispatch({ type: 'SET_COMPILER_STATUS', payload: 'errored' })
    try {
      const report = JSON.parse(err.message)

      dispatch({ type: 'SET_COMPILER_FEEDBACK', payload: report })
    } catch (e) {
      dispatch({ type: 'SET_COMPILER_FEEDBACK', payload: err.message })
    }
  }

  const value = {
    appState,
    dispatch,
    plugin
  }

  return (
    <div className="circuit_compiler_app">
      <RenderIf condition={locale.messages}>
        <IntlProvider locale={locale.code} messages={locale.messages}>
          <CircuitAppContext.Provider value={value}>
            <Container />
          </CircuitAppContext.Provider>
        </IntlProvider>
      </RenderIf>
    </div>
  )
}

export default App
