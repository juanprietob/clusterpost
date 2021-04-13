import React, {Component} from 'react'

import { connect } from "react-redux";
import {Accordion, ListGroup, Container, Button, Table, Card, Col, Row, DropdownButton, Dropdown, Form, Modal, Alert, OverlayTrigger, Overlay, Tooltip, Popover, Badge, ButtonToolbar, ButtonGroup, InputGroup, FormControl, Spinner, Navbar, Nav, Breadcrumb, ProgressBar, Collapse, Tabs, Tab} from 'react-bootstrap'
import {Edit2, X, ChevronDown, ChevronUp, HelpCircle, XCircle} from 'react-feather'

import {ClusterpostService} from 'clusterpost-list-react'

const _ = require('underscore');
const Promise = require('bluebird');

class ClusterpostSoftware extends Component {

	constructor(props){
		super(props);

		this.state = {
			newSoftware: {
				name: "",
				description: "",
				command: "",
				patterns: [],
				docker: "",
				cpus: "",
				mem: "",
				gpu: false
			},
		}

		if(this.props.newSoftware){
			this.state.newSoftware = this.props.newSoftware
		}

	}

	componentDidMount() {

		this.clusterpostservice = new ClusterpostService();
		this.clusterpostservice.setHttp(this.props.http);

	}

	componentDidUpdate(prevProps, prevState, snapshot){
		console.log(this.props.newSoftware)
		if (this.props.newSoftware !== prevProps.newSoftware) {
			this.setState({newSoftware: this.props.newSoftware});
		}
	}

	saveSoftware() {
		const self = this
		var {newSoftware} = self.state

		if (newSoftware.description==""
			|| newSoftware.command==""
			|| (!newSoftware.patterns) 
			|| newSoftware.patterns.length==0) {
			return false
		} else {
			
			newSoftware.type = "software"

			return self.clusterpostservice.uploadSoftware(newSoftware)
			.then(()=>{
				newSoftware = {
					name: "",
					description: "",
					command: "",
					patterns: [],
					docker: "",
					cpus: "",
					mem: "",
					gpu: false
				}
				self.setState({newSoftware})
			})
		}
	}

	addParam() {
		const self = this
		var {newSoftware} = self.state

		var newFlag = {
			appendMatchDir: false,
			flag: "",
			pattern: "",
			value: "",
			suffix: "",
			prefix: ""
		}

		newSoftware.patterns.push({...newFlag, position: newSoftware.patterns.length})
		self.setState({...self.state, newSoftware: newSoftware})

	}

	createNewSoftware() {
		const self = this
		var {newSoftware} = self.state
		
		return (
			<Col>
				
				<Form onSubmit={(e) => {self.saveSoftware()}}>
					<Form.Row>
						<Form.Control value={newSoftware.name} placeholder="name" type="text" autoComplete="off" onChange={(e) => {newSoftware.name = e.target.value; self.setState({newSoftware})}}/>
						<Form.Control value={newSoftware.description} placeholder="description" type="text" autoComplete="off" onChange={(e) => {newSoftware.description = e.target.value; self.setState({newSoftware})}}/>
					</Form.Row>
					<Form.Row>
						<Form.Control value={newSoftware.command} placeholder="executable" type="text" autoComplete="off" onChange={(e) => {newSoftware.command = e.target.value; self.setState({newSoftware})}}/>
					</Form.Row>
					<Form.Row>
						<Form.Control value={newSoftware.docker} placeholder="docker tag" type="text" autoComplete="off" onChange={(e) => {newSoftware.docker = e.target.value; self.setState({newSoftware})}}/>
						<Form.Control value={newSoftware.cpus} placeholder="number of cpus" type="number" autoComplete="off" onChange={(e) => {newSoftware.cpus = e.target.value; self.setState({newSoftware})}}/>
						<Form.Control value={newSoftware.mem} placeholder="memory in mb" type="number" autoComplete="off" onChange={(e) => {newSoftware.mem = e.target.value; self.setState({newSoftware})}}/>
						<Form.Check checked={newSoftware.gpu} type="checkbox" label="gpu" autoComplete="off" onChange={(e) => {newSoftware.gpu = e.target.checked; self.setState({newSoftware})}}/>
					</Form.Row>
					<Form.Row>
						<ButtonGroup>
							<Button variant="primary" onClick={() => self.addParam()}> add parameter</Button>
							<Button disabled={newSoftware.command==""} variant="success" type="submit"> Save software </Button>
						</ButtonGroup>
					</Form.Row>
				</Form>
				<Row>
					<Alert variant="info">
						<Alert.Heading>Software parameters</Alert.Heading>
						<InputGroup>
							{
								_.map(newSoftware.patterns, (p)=>{
									return (
										<InputGroup>
											<Form.Check value={p.appendMatchDir} defaultChecked={p.appendMatchDir} label="Append match dir" type="checkbox" onChange={(e) => {p.appendMatchDir = e.target.checked; self.setState({...self.state, newSoftware})}}/>
											<FormControl value={p.flag} placeholder="flag" type="text" autoComplete="off" onChange={(e) => {p.flag = e.target.value; self.setState({...self.state, newSoftware}) }}/>
											<FormControl value={p.pattern} placeholder="pattern" type="text" autoComplete="off" onChange={(e) => {p.pattern = e.target.value; self.setState({...self.state, newSoftware}) }}/>
											<FormControl value={p.value} placeholder="value" type="text" autoComplete="off" onChange={(e) => {p.value = e.target.value; self.setState({...self.state, newSoftware}) }}/>
											<FormControl value={p.suffix} placeholder="suffix" type="text" autoComplete="off" onChange={(e) => {p.suffix = e.target.value; self.setState({...self.state, newSoftware}) }}/>
											<FormControl value={p.prefix} placeholder="prefix" type="text" autoComplete="off" onChange={(e) => {p.prefix = e.target.value; self.setState({...self.state, newSoftware}) }}/>
										</InputGroup>
									)
								})
							}
						</InputGroup>
					</Alert>
				</Row>
			</Col>
		)
	}

	render() {
		return(
			<Container fluid="true">
				{this.createNewSoftware()}
			</Container>
		)
	}
}

const mapStateToProps = (state, ownProps) => {
  return {
    user: state.jwtAuthReducer.user,
    http: state.jwtAuthReducer.http,
  }
}

export default connect(mapStateToProps)(ClusterpostSoftware);