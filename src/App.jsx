import Cobe from './Cobe.jsx';
import LocationSelection from './LocationSelection.jsx';
import { useEffect, useRef, useState } from 'react';
import { AwesomeButton } from 'react-awesome-button';
import 'react-awesome-button/dist/styles.css';
import { run } from './importance_sampling';
import { ThreeDots } from 'react-loader-spinner';


export default function App() {
  const [uiPage, setUIPage] = useState('locationSelection');
  const uiIsLoading = useRef(false);
  const SF = {
    latitude: 37.773972,
    longitude: -122.431297,
  };
  const [selectedLocation, setSelectedLocation] = useState(SF);
  const [markedLocations, setMarkedLocations] = useState([]);
  // dark background

  return (
    <div
      className="App"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {uiPage === 'cobe' && markedLocations.length > 0 ? (
        <Cobe selectedLocation={selectedLocation} markedLocations={markedLocations} />
      ) : (
        <LocationSelection
          setSelectedLocation={setSelectedLocation}
          selectedLocation={selectedLocation}
        />
      )}
      {uiPage === 'locationSelection' ? (
        <AwesomeButton
          type="primary"
          onPress={() => {
            console.log(selectedLocation);
            let generatedLocations = run(
              selectedLocation.latitude,
              selectedLocation.longitude,
            );
            uiIsLoading.current = true;
            setMarkedLocations(
              generatedLocations
            );
            console.log("marked locations", generatedLocations);
            console.log("selected location", selectedLocation);
            setUIPage('cobe');
            uiIsLoading.uiIsLoading = false;
          }}
        >
          Finished Location Selection
        </AwesomeButton>
      ) : (
        // <AwesomeButton
        //   type="primary"
        //   onPress={() => {
        //     setUIPage('locationSelection');
        //   }}
        // >
        //   Back to Location Selection
        // </AwesomeButton>
        null
        
      )}
    </div>
  );
}
