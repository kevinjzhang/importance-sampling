import { useRef, useState } from 'react';

import {
  Map,
  useClick,
  useDrag,
  useZoom,
  Marker,
  OverlayLayer,
  SVGPin,
} from '@jetblack/map';
import {run} from './importance_sampling'

const tileSize = { width: 256, height: 256 };

export default function LocationSelection({ setSelectedLocation, selectedLocation }) {
  // A ref is required to bind events to the map.
  const ref = useRef(null);

  const [zoom] = useZoom({ ref, defaultZoom: 2, minZoom: 2 });

  const [center] = useDrag({
    ref,
    zoom,
    tileSize,
  });
  useClick({
    ref,
    center,
    zoom,
    tileSize,
    onClick: (coordinate, point) => {
      console.log('click', { coordinate, point });
      console.log(zoom);
      setSelectedLocation(coordinate);
    },
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <h1 style={{ textAlign: 'center' }}>Location Selection</h1>
      <p>Click on the map to select a location.</p>
      <Map
        ref={ref} // Bind the ref to the map component.
        center={center} // The useDrag hook updates the center property.
        zoom={zoom} // The useZoom hook updates the zoom property.
        width="1000px"
        height="500px"
      >
        <OverlayLayer>
          <Marker
            coordinate={selectedLocation}
            render={point => <SVGPin point={point} />}
          />
        </OverlayLayer>
      </Map>
      <p>
        Selected location: {selectedLocation.latitude},{' '}
        {selectedLocation.longitude}
      </p>
    </div>
  );
}
