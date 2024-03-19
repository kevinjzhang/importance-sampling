import createGlobe from 'cobe';
import { useEffect, useRef, useState } from 'react';
import { useSpring } from 'react-spring';
import { AwesomeButton } from 'react-awesome-button';
import 'react-awesome-button/dist/styles.css';

function convertCoordinateToMarker(coordinate) {
  console.log("processing cordinate", coordinate);
  let res = {
    location: [coordinate.selectedLocation.longitude, coordinate.selectedLocation.latitude],
    size: 0.1,
  }
  return res
}

function convertMarkedPointsToMarkers(markedPoints) {
  let res = []
  for (let i = 0; i < markedPoints.length; i++) {
    let temp = {
      location: [markedPoints[i][0], markedPoints[i][1]],
      size: 0.1,
    }
    res.push(temp)
  }
  console.log("haha",res)
  return res
}

export default function Cobe({selectedLocation, markedLocations}) {
  const canvasRef = useRef();
  const pointerInteracting = useRef(null);
  const pointerInteractionMovement = useRef(0);
  const locationToAngles = (lat, long) => {
    return [Math.PI - ((long * Math.PI) / 180 - Math.PI / 2), (lat * Math.PI) / 180]
  }
  const selectedLocationRef = useRef(selectedLocation);
  const [{ r }, api] = useSpring(() => ({
    r: 0,
    config: {
      mass: 1,
      tension: 280,
      friction: 40,
      precision: 0.001,
    },
  }));
  const focusRef = useRef([0, 0])


  useEffect(() => {
    if (markedLocations.length === 0) {
      return
    }
    let width = 0;
    let currentPhi = 0;
    let currentTheta = 0;
    const doublePi = Math.PI * 2;
    
    const onResize = () => canvasRef.current && (width = canvasRef.current.offsetWidth)
    window.addEventListener('resize', onResize)
    onResize()
    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: 0.3,
      dark: 1,
      diffuse: 3,
      mapSamples: 32000,
      mapBrightness: 1.2,
      baseColor: [1, 1, 1],
      markerColor: [251 / 255, 100 / 255, 21 / 255],
      glowColor: [1.2, 1.2, 1.2],
      markers: convertMarkedPointsToMarkers(markedLocations),
      onRender: (state) => {
        state.phi = currentPhi
        state.theta = currentTheta
        const [focusPhi, focusTheta] = focusRef.current
        const distPositive = (focusPhi - currentPhi + doublePi) % doublePi
        const distNegative = (currentPhi - focusPhi + doublePi) % doublePi
        // Control the speed
        if (distPositive < distNegative) {
          currentPhi += distPositive * 0.08
        } else {
          currentPhi -= distNegative * 0.08
        }
        currentTheta = currentTheta * 0.92 + focusTheta * 0.08
        state.width = width * 2
        state.height = width * 2
      }
    });
    console.log("marked locations", markedLocations);
    console.log("markers", convertMarkedPointsToMarkers(markedLocations));
    setTimeout(() => (canvasRef.current.style.opacity = '1'));
    return () => {
      globe.destroy();
      window.removeEventListener('resize', onResize);
    };
  }, [markedLocations]);

  useState(() => {
    console.log("selectedLocation", selectedLocation);
  }, [selectedLocation]);

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '40vw',
        aspectRatio: 1,
        margin: 'auto'
      }}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={e => {
          pointerInteracting.current =
            e.clientX - pointerInteractionMovement.current;
          canvasRef.current.style.cursor = 'grabbing';
        }}
        onPointerUp={() => {
          pointerInteracting.current = null;
          canvasRef.current.style.cursor = 'grab';
        }}
        onPointerOut={() => {
          pointerInteracting.current = null;
          canvasRef.current.style.cursor = 'grab';
        }}
        onMouseMove={e => {
          if (pointerInteracting.current !== null) {  
            const delta = e.clientX - pointerInteracting.current;
            pointerInteractionMovement.current = delta;
            api.start({
              r: delta / 200,
            });
          }
        }}
        onTouchMove={e => {
          if (pointerInteracting.current !== null && e.touches[0]) {
            const delta = e.touches[0].clientX - pointerInteracting.current;
            pointerInteractionMovement.current = delta;
            api.start({
              r: delta / 100,
            });
          }
        }}
        style={{
          width: '100%',
          height: '100%',
          cursor: 'grab',
          contain: 'layout paint size',
          opacity: 0,
          transition: 'opacity 1s ease',
        }}
      />
      <div className="flex flex-col md:flex-row justify-center items-center control-buttons" style={{ gap: '.5rem' }}>
        {markedLocations.map((point, i) => (
          <button onClick={() => {
            focusRef.current = locationToAngles(point[0], point[1])
          }}>{i}</button>
        ))}
      </div>
    </div>
  );
}
