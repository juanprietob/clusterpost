import React, { Component } from 'react';
import { Route, HashRouter } from 'react-router-dom';

import './bootstrap.min.css'

import {JWTAuth, JWTAuthInterceptor, JWTAuthUsers, JWTAuthProfile, JWTAuthService} from 'react-hapi-jwt-auth';

import NavBar from './nav-bar'
import Carousel from 'react-bootstrap/Carousel';
import Image from 'react-bootstrap/Image'
import Modal from 'react-bootstrap/Modal';
import Dropdown from 'react-bootstrap/Dropdown';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Container from 'react-bootstrap/Container';

import {Edit2, Trash2} from 'react-feather'

import axios from 'axios';
import store from "./redux/store";
import { connect } from "react-redux";

import {ClusterpostJobs, ClusterpostTokens, ClusterpostDashboard, ClusterpostSoftware, ClusterpostService} from 'clusterpost-list-react'

const _ = require('underscore')

class App extends Component {

  constructor(props){
    super(props);

    let http = axios;
    if(process.env.NODE_ENV === 'development'){
      http = axios.create({
        baseURL: 'http://localhost:8180'
      });
    }

    this.state = {
      user: {},
      showLogin: true,
      selectedSoftware: {},
      newSoftware: {
        name: "",
        description: "",
        command: "",
        patterns: [],
        docker: "",
        cpus: "",
        mem: "",
        gpu: false
      }
    }

    store.dispatch({
      type: 'http-factory',
      http: http
    });

    this.clusterpost = {};

    const self = this;

    const interceptor = new JWTAuthInterceptor();
    interceptor.setHttp(http);
    interceptor.update();
    
    const jwtauth = new JWTAuthService();
    jwtauth.setHttp(http);
    jwtauth.getUser()
    .then(function(user){
      self.setState({...self.state, user: user, showLogin: false});
      store.dispatch({
        type: 'user-factory', 
        user: user
      });
    });

    self.clusterpostservice = new ClusterpostService();
    self.clusterpostservice.setHttp(http);

    this.getSoftwares();
  }

  componentWillReceiveProps(newProps){
     if(newProps.user != this.props.user){
         this.setState({user: newProps.user})
     }
     this.setState({showLogin: true});
  }

  handleHide(){
    this.setState({...this.state, showLogin: false});
  }

  login(){
    const {showLogin} = this.state;

    return (<Modal size="lg" show={showLogin} onHide={this.handleHide.bind(this)}>
              <div class="alert alert-info">
                <Modal.Header closeButton>
                  <Modal.Title>Please login</Modal.Title>
                </Modal.Header>
              </div>
              <Modal.Body><JWTAuth></JWTAuth></Modal.Body>
            </Modal>);
  }

  getSoftwares() {
    const self = this

    self.clusterpostservice.getSoftware()
    .then(res => {
      self.setState({softwares: res.data})
    })
  }

  profile(){
    return (<div class="container">
        <div class="row justify-content-center">
          <div class="card col-8">
            <div class="card-body">
              <JWTAuthProfile></JWTAuthProfile>
            </div>
          </div>
        </div>
      </div>);
  }

  adminUsers(){
    return (<div class="container">
        <div class="row justify-content-center">
          <JWTAuthUsers></JWTAuthUsers>
        </div>
      </div>);
  }

  adminServers(){
    return (<div class="container">
      <div class="row justify-content-center">
        <ClusterpostTokens></ClusterpostTokens>
      </div>
    </div>);
  }

  computing(){
    return <div class="container">
        <div class="row justify-content-center">
          <ClusterpostJobs></ClusterpostJobs>
        </div>
      </div>;
  }

  deleteSoftware(){
    const self = this
    var {selectedSoftware} = self.state
    if(selectedSoftware){
      self.clusterpostservice.deleteSoftware(selectedSoftware)
      .then(()=>{
        self.getSoftwares()
      });

      self.setState({selectedSoftware: {}})
    }
    
  }

  editSoftware(){
    const self = this
    var {selectedSoftware} = self.state
    self.setState({newSoftware: selectedSoftware})  
    
  }

  chooseSoftware() {
    const self = this
    const {selectedSoftware, softwares, runDisabled} = self.state

    return (
      <ButtonGroup>
        <Dropdown className="mt-1 mb-1 ml-2 mr-2">
          <Dropdown.Toggle variant="info">
            <i>Select: {selectedSoftware.name}</i>
          </Dropdown.Toggle>
          <Dropdown.Menu>
            {
              _.map(softwares, (software) =>{
                  return (<Dropdown.Item onClick={(e) => {
                    self.setState({
                      selectedSoftware: software
                    })
                  }}>{software.name}</Dropdown.Item>)
                }
              )
            }
          </Dropdown.Menu>
        </Dropdown>

        <Trash2 style={{color: "green", height: 20, cursor: "pointer", top: 0, bottom: 0, margin: "auto"}} onClick={() => self.deleteSoftware()}/>
        <Edit2 style={{color: "green", height: 20, cursor: "pointer", top: 0, bottom: 0, margin: "auto"}} onClick={() => self.editSoftware()}/>

      </ButtonGroup>
    )

  }

  software(){
    var {newSoftware} = this.state
    return (<Container fluid="true">
        {this.chooseSoftware()}
        <ClusterpostSoftware newSoftware={newSoftware}/>
      </Container>)
  }

  home(){
    const {user} = this.state;
    if(!user.name){
      return (
        <div class="container">
          <div class="row">
            <div class="col-8">
              <Carousel>
                <Carousel.Item>
                  <Image src="/images/icosahedron.png" fluid/>
                  <Carousel.Caption>
                    <h3>3D modeling and visualization</h3>
                  </Carousel.Caption>
                </Carousel.Item>
                <Carousel.Item>
                  <Image src="/images/fibers.png" fluid/>
                  <Carousel.Caption>
                    <h3>High performance computing</h3>
                  </Carousel.Caption>
                </Carousel.Item>
                <Carousel.Item>
                  <Image src="/images/segmentation.png" fluid/>
                  <Carousel.Caption>
                    <h3>Automated image processing</h3>
                  </Carousel.Caption>
                </Carousel.Item>
                <Carousel.Item>
                  <Image src="/images/subcortical.png" fluid/>
                  <Carousel.Caption>
                    <h3>Data storage and retrieval</h3>
                  </Carousel.Caption>
                </Carousel.Item>
              </Carousel>
            </div>
            <div class="col-4">
              Our mission is to provide the resources for storage and computation for your organization
            </div>
          </div>
        </div>);
    }else{
      return (
        <div class="container">
          <div class="row">
            <ClusterpostDashboard/>
          </div>
        </div>
        );
    }
    
  }

  render(){
    return (
      <div className="App">
        <HashRouter>
          <header className="App-header">
            <NavBar/>
          </header>
          <Route path="/login" component={this.login.bind(this)}/>
          <Route path="/logout" component={this.login.bind(this)}/>
          <Route path="/user" component={this.profile.bind(this)}/>
          <Route path="/software" component={this.software.bind(this)}/>
          <Route path="/admin/users" component={this.adminUsers.bind(this)}/>
          <Route path="/admin/servers" component={this.adminServers.bind(this)}/>
          <Route path="/computing" component={this.computing.bind(this)}/>
          <Route path="/home" component={this.home.bind(this)}/>
        </HashRouter>
      </div>
    );
  }
  
}

const mapStateToProps = (state, ownProps) => {
  return {
    user: state.jwtAuthReducer.user,
    showLogin: state.navbarReducer.showLogin
  }
}

export default connect(mapStateToProps)(App);