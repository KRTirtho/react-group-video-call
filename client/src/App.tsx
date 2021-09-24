import React from 'react'
import { Route, Switch } from 'react-router'
import { CreateRoom } from './pages/start/CreateRoom'
import { Room } from './pages/room/Room'

function App() {
  return <Switch>
    <Route path="/" exact>
      <CreateRoom/>
    </Route>
    <Route path="/:room">
      <Room/>
    </Route>
  </Switch>
}

export default App
