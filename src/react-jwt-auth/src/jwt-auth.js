import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';

import JWTAuthService from './jwt-auth-service';

import _ from 'underscore';

import { connect } from "react-redux";
import { withRouter } from 'react-router-dom';

class JWTAuth extends Component {

  constructor(props) {
    super(props);

    this.pleaseLogin = this.pleaseLogin.bind(this);
    this.login = this.login.bind(this);
    this.recoverPassword = this.recoverPassword.bind(this);
    this.createUserForm = this.createUserForm.bind(this);
    this.createUser = this.createUser.bind(this);
    this.resetUserPasswordForm = this.resetUserPasswordForm.bind(this);
    this.resetUserPassword = this.resetUserPassword.bind(this);
    this.getAuthService = this.getAuthService.bind(this);
    this.switchCreateForm = this.switchCreateForm.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.setObjectProperty = this.setObjectProperty.bind(this);

    this.state = {
      isCreateUser: false,
      isLoggedIn: false,
      user: {
        email: '',
        password: ''
      },
      newUser: {
        name: '',
        email: '',
        password: ''
      },
      resetUser: {
        password0: '',
        password1: ''
      }
    };

  }

  componentDidMount(){

    const self = this;
    const {location, history, routeLogout} = this.props;

    this.jwtauth = new JWTAuthService();
    this.jwtauth.setHttp(this.props.http);

    if(location && location.pathname == "/logout" ){
        this.jwtauth.logout()
        .then(function(){
          history.push(routeLogout);
          self.props.userFactory({});
        })
    } 
  }

  render() {
    let userInputs;
    const isCreateUser = this.state.isCreateUser;
    const isLoggedIn = this.state.isLoggedIn;

    if(isCreateUser){
      userInputs = this.createUserForm();
    }else{
      userInputs = this.pleaseLogin();
    }    

    return (
      <div class="card">
        <div class="card-body" style={{"textAlign": "center"}}>
          {userInputs}
        </div>
      </div>
      );
  }

  switchCreateForm(){
    this.setState({isCreateUser: !this.state.isCreateUser});
  }

  setObjectProperty(obj, path, value) {
    var schema = obj;
    var pList = path.split('.');
    var len = pList.length;
    for(var i = 0; i < len-1; i++) {
        var elem = pList[i];
        if( !schema[elem] ) schema[elem] = {}
        schema = schema[elem];
    }

    schema[pList[len-1]] = value;
    return obj;
  }

  handleInputChange(event) {
    const target = event.target;

    const targetPropertyName = target.name.substr(target.name.indexOf('.') + 1);
    const targetObjectName = target.name.substr(0, target.name.indexOf('.'));
    const value = target.value;

    var obj = this.setObjectProperty(this.state[targetObjectName], targetPropertyName, value);

    this.setState({
      [targetObjectName]: obj
    });
  }

  pleaseLogin(){
    return (
        <div class="col">
          <form onSubmit={this.login}>
            <h2>{this.props.title}</h2>
            <div class="form-group">
              <label for="inputEmail" class="sr-only">Email address</label>
              <input id="inputEmail" class="form-control" placeholder="Email address" required autofocus="" type="email" value={this.state.user.email} name="user.email" onChange={this.handleInputChange} data-container="#divlogin" data-toggle="popover" data-placement="right" data-content="Please enter your email address"/>
              <label for="inputPassword" class="sr-only">Password</label>
              <input id="inputPassword" class="form-control" placeholder="Password" required type="password" value={this.state.user.password} name="user.password" onChange={this.handleInputChange} pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}" title="Must contain at least one number and one uppercase and lowercase letter, and at least 6 or more characters"/>
              <button id="loginbutton" class="btn btn-lg btn-primary btn-block" type="submit" data-container="#divlogin" data-toggle="popover" data-placement="right" data-content="Check if email and password are correct!" data-template='<div class="popover alert-danger" role="tooltip"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content alert-danger"></div></div>'>Login</button>
            </div>
          </form>
          <div class="row justify-content-center">
            <div class="col-6">
              <div class="input-group">
                <div class="input-group-prepend">
                  <span class="input-group-text" id="basic-addon1">Forgot your password?</span>
                </div>
                <button class="btn btn-secondary btn-sm" onClick={this.recoverPassword}>click here</button>
              </div>
            </div>
          </div>
          <div class="row justify-content-center">
            <div class="col-6">
              <div class="input-group">
                <div class="input-group-prepend">
                  <span class="input-group-text" id="basic-addon1">New user?</span>
                </div>
                <button class="btn btn-secondary btn-sm" onClick={this.switchCreateForm}>create new account</button>
              </div>
            </div>
          </div>
        </div>
    );
  }

  login(event){
    const {history, routeLogin} = this.props;
    event.preventDefault();
    var self = this;
    this.jwtauth.login(this.state.user)
    .then(function(res){
      return self.jwtauth.getUser();
    })
    .then(function(res){
      self.props.userFactory(res);
      history.push(routeLogin);
    });
  }

  recoverPassword(event){
    if(!this.state.user.email){
      this.jwtauth.sendRecoverPassword({
        email: this.state.user.email
      })
      .then(function(res){
        alert(res.data);
      })
      .catch(function(e){
        if(e.status === 401){
          alert("Account not found! You need to create an account.");
        }
      })
    }
  }
  
  createUserForm(){
    return (<div class="col">
        <form autoComplete="new-password" onSubmit={this.createUser}>
          <h2>Create an account</h2>
          <div class="form-group">
            <label for="inputNameCreate" class="sr-only">User Name</label>
            <input id="inputNameCreate" class="form-control" placeholder="User name" required="" autofocus="" type="text" value={this.state.newUser.name} name="newUser.name" onChange={this.handleInputChange} autoComplete="new-password"/>
            <label for="inputEmailCreate" class="sr-only">Email address</label>
            <input id="inputEmailCreate" class="form-control" placeholder="Email address" required="" type="email" value={this.state.newUser.email} name="newUser.email" onChange={this.handleInputChange}
            data-container="#divCreate" data-toggle="popover" data-placement="right" data-content="You have an account with that email address already." autoComplete="new-password"/>
            <label for="inputPasswordCreate" class="sr-only" >Password</label> 
            <input id="inputPasswordCreate" class="form-control" placeholder="Password" required type="password" value={this.state.newUser.password} name="newUser.password" onChange={this.handleInputChange} pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}" title="Password must contain at least one number and one uppercase and lowercase letter, and at least 6 or more characters" autoComplete="new-password"/> 
            <button class="btn btn-lg btn-primary btn-block" type="submit">Create and Login</button>
          </div>
        </form>
        <div class="row justify-content-center">
          <div class="col-6">
            <div class="input-group">
              <div class="input-group-prepend">
                <span class="input-group-text" id="basic-addon1">Existing user?</span>
              </div>
              <button class="btn btn-secondary btn-sm" onClick={this.switchCreateForm}>Login with your account</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  createUser(event){
    const {history, routeLogin} = this.props;
    event.preventDefault();
    this.jwtauth.createUser(this.state.newUser)
    .then(function(res){
      return self.jwtauth.getUser();
    })
    .then(function(res){
      self.props.userFactory(res);
      history.push(routeLogin);
    });
  }


  resetUserPasswordForm(){
    return (
      <form autoComplete="new-password" onSubmit={this.resetUserPassword}>
        <h2 class="form-login-heading">Reset your password</h2>
        <div class="form-group">
          <label for="inputPassword0" class="sr-only">Password</label>
          <input id="inputPassword0" class="form-control" placeholder="Password" required="" type="password" value={this.state.resetUser.password0} name="resetUser.password0" onChange={this.handleInputChange} autoComplete="new-password"/>
          <label for="inputPassword1" class="sr-only">Confirm Password</label>
          <input id="inputPassword1" class="form-control" placeholder="Confirm assword" required="" type="password" value={this.state.resetUser.password1} name="resetUser.password1" onChange={this.handleInputChange} autoComplete="new-password"/>
          <button class="btn btn-lg btn-primary btn-block" type="submit">Reset and Login</button>
        </div>
        <p> <a href="#/welcome">Login page</a> </p>
      </form>
    );
  }

  resetUserPassword(){
    var errorMsg = "";
    if(this.state.resetUser.password0 === this.state.resetUser.password1){
      auth.updatePassword({
        password: this.state.resetUser.password0
      }, this.state.resetUser.token)
      .then(function(){
        return auth.getUser();
      })
      .then(function(res){
        self.props.history.push('/home');
      })
      .catch(function(e){
        console.error(e);
      });
    }
    else
    {
      alert('Passwords are not the same');
      return false;
    }
  }


  getAuthService(){
    return auth;
  }
}

const mapStateToProps = (state, ownProps) => {
  return {
    http: state.jwtAuthReducer.http
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    userFactory: user => {
      dispatch({
        type: 'user-factory',
        user: user
      });
    }
  }
}

JWTAuth.defaultProps = {
  routeLogin: '/home',
  routeLogout: '/'
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(JWTAuth));