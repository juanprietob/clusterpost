import React, { Component } from 'react';
import { Switch, Route, Link, withRouter } from 'react-router-dom';
import logo from './logo.svg';
import './App.css';
import '../node_modules/bootstrap/dist/css/bootstrap.css';

import JWTAuth from 'react-jwt-auth';

class App extends Component {

  constructor(props) {
    super(props);
    this.login = this.login.bind(this);
    this.home = this.home.bind(this);
    this.handleRedirect = this.handleRedirect.bind(this);
    
  }

  login(){
    return (<div class="container">
          <div class="row justify-content-center">
            <div class="card col-8">
              <div class="card-body">
                <JWTAuth onRedirect={this.handleRedirect}></JWTAuth>
              </div>
            </div>
          </div>
        </div>);
  }

  home(){
    return <div class="container">
          <div class="row justify-content-center">
            <div class="card col-8">
              <div class="card-body">
                ddd
              </div>
            </div>
          </div>
        </div>;
  }

  handleRedirect(path){
    this.props.history.push(path);
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <p>
            Edit <code>src/App.js</code> and save to reload.
          </p>
          <a
            className="App-link"
            href="https://reactjs.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn React
          </a>
          <ul>
            <li>
              <Link to="/login">Login</Link>
            </li>
          </ul>
        </header>
        <Switch>
          <Route path="/login" component={this.login}/>
          <Route path="/" component={this.home}/>
        </Switch>
      </div>
    );
  }
}

export default withRouter(App);
