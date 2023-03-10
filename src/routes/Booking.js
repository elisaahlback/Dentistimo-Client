import React from "react";
import "./BookingStyles.css";
import AvailableAppointment from "../components/AvailableAppointment";
import Calendar from "../components/Calendar";
import NavPanel from "../components/NavPanel";
import Popup from "../components/Popup";
import Map from "../components/Map";

import { useState, useRef } from "react";


const engLang = require('../languages/english').bookings
const sweLang = require('../languages/swedish').bookings


let clientLoaded = false

const Paho = require('paho-mqtt')


const brokerHost = 'localhost'
const brokerPort = 9001
const clientId = ""

let currentClinic= null
const sQos = 2
const pQos = 2
//list of all the appointments that are not connected to the react variable
let nonReactAppointments = null

let nonReactEntries = null

let isLoaded = false
let initLoad = false
let update = null

let requestAppointments = null
let isConnected = false
let currentSub = null

let bFunc = null


export const Booking = () =>{
  const [bookingResponse, setBookingResp] = useState(false);
  const [errBookingResponse, setErrBookingResp] = useState(false);
 
  const uID = window.localStorage.getItem('uID')

  const [freeAppointments, setFAppointments] = useState([]); 

  const [bookingSuccess, setBookingSuccess] = useState(engLang.bookingSuccess);
  const [bookingUnsuccess, setBookingUnsuccess] = useState(engLang.bookingUnsuccess);
  const [chooseClinic, setChooseClinic] = useState(engLang.chooseClinic);
  if(!clientLoaded){
    clientLoaded = true
    const client = new Paho.Client(brokerHost,brokerPort,clientId)

    const bookAppointment = (date) => {
      const payload = {operation: 'book-appointment', date:date, clinicId:currentClinic, userId:uID, opCat: 'appointment'}
      const strPayload = JSON.stringify(payload)
      client.publish(`common/${uID}`, strPayload,pQos)
    }

    bFunc = bookAppointment

  //handles the appointments that are recieved from the request
  const onMessage = (message) => {
    try{
      const resJSON = JSON.parse(message.payloadString)
      switch(resJSON.operation){
        case 'book-appointment':
          if(resJSON.success){
            setBookingResp(true);
          } else {
            setErrBookingResp(true);
          }
          break;
        case 'clinic-free-slots':
          appointments = resJSON.data
          let n = -1
        
          nonReactAppointments = appointments.slots.map(appointment => {
              n++;
              const info = appointment
              info.month = appointments.m
              info.year = appointments.yr
              return <AvailableAppointment appointmentInfo={info} bookFunc={bookAppointment} key={n} />
          })

          const appDaySorted = []
          for(const appointment of appointments.slots){
            
            const day = appointment.d

            if(appDaySorted[day-1]){
              appDaySorted[day-1].push(appointment)
            } else {
              appDaySorted[day-1] = []
              appDaySorted[day-1].push(appointment)
            }
          }
          setFAppointments(appDaySorted)

          if(isLoaded){
            update(nonReactAppointments)
          } 
          break;  
        default:
          break;
      }
    } catch(e){
    }
  }

  function reqApp() {
    if(isConnected){
      let clinic = localStorage.getItem('savedClinic')
      let year = localStorage.getItem('savedYear')
      let month = localStorage.getItem('savedMonth')

      if(currentSub){
        client.unsubscribe(currentSub)
      }

      currentSub = `clinics/${clinic}/${year}/${month}`
      currentClinic = clinic

      client.subscribe(currentSub,{qos:sQos, onSuccess: () => {
        const payload = {operation: 'unbooked-appointments', year: year, month:month, clinicId:clinic, opCat: 'appointment'}
        const strPayload = JSON.stringify(payload)
        client.publish(`common/common`, strPayload,pQos)
      }})
    }
  }

  requestAppointments = reqApp

  client.onMessageArrived = onMessage;

  client.connect({onSuccess: onConnect})

  function onConnect () {
    isConnected = true
    client.subscribe(`${uID}/appointments`,{qos:sQos})
  }
}


  let [appointments, setAppointments] = useState([])

   isLoaded = true

    
  if(nonReactAppointments && !initLoad){
    setAppointments(nonReactAppointments)
    initLoad =true
  }
    
  update = (newAppointments, sAppoints) =>{
    setAppointments(newAppointments)
    
  }


  const chosenLang = localStorage.getItem('lang');
  const [pageLang, setLang] = useState('eng'); 

  function checkLang() {
      if(chosenLang !== pageLang){
      
      setLang(chosenLang)
      let langObj = null
      switch (chosenLang) {
          case 'eng':
          langObj = engLang  
          break;
          case 'swe':
          langObj = sweLang
          break;
          default:
          langObj = engLang
          break;
      }
       setBookingSuccess(langObj.bookingSuccess);
       setBookingUnsuccess(langObj.bookingUnsuccess);
       setChooseClinic(langObj.chooseClinic);
      }
  }

  checkLang()

  return (
    <div>  
      <NavPanel></NavPanel>
      <p className="header">{chooseClinic}</p>
      <div>
        {/* <button className="Sort">Filter by</button>   */}
        
        <label>{bookingResponse}</label>
          <Popup trigger={bookingResponse} setTrigger={setBookingResp}>
        <p>{bookingSuccess}</p>
        </Popup>
        <Popup trigger={errBookingResponse} setTrigger={setErrBookingResp}> 
        <p>{bookingUnsuccess}</p>
        </Popup>
      </div> 
      <div className="AList">
          {/* {appointments} */}
      </div>
      <Map zoom={10} center={{"lat":57.75,"lng":11.92}} reqApp={requestAppointments} />
      <Calendar dayEntries={freeAppointments} bFunc={bFunc} reqApp={requestAppointments} />
    </div>
  )
};

export default Booking;