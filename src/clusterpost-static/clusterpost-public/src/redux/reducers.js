import { combineReducers } from "redux";
import navbarReducer from "./navbar-reducer";
import {jwtAuthReducer} from "react-hapi-jwt-auth"

export default combineReducers({ navbarReducer, jwtAuthReducer });
