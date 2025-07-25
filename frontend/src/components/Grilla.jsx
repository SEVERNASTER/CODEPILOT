
import './Grilla.css'

import Celda from './Celda';
import { useRef, useState, useEffect } from 'react';
import muroImg from '../assets/muro2.jpg';
import Bot from '../components/Bot';



function Grilla({ pos, sentido, filas, columnas, mapa, botAnimado, colisionArriba,
    colisionAbajo, colisionDerecha, colisionIzquierda, reiniciar, ejecutando, secuencia,
    indice, jugando, secuenciaProc1, indiceProc1
}) {


    const colorFondo = (valor) => {
        if (valor === 0) {// camino libre
            return 'linear-gradient(#0954D1, #18B1F8)'
        }

        if (valor === 0) {// obstaculo
            return 'none'
        }

        if (valor === 2) {//si luz
            return 'linear-gradient(#CB23D6, #6C4BEA)'
        }

        if (valor === 3) {// si es luz prendida
            return '#FFFC00'
        }

    }


    const grillaRef = useRef(null);
    const [dimensiones, setDimensiones] = useState({ ancho: 0, alto: 0 });

    useEffect(() => {
        if (grillaRef.current) {
            const { width, height } = grillaRef.current.getBoundingClientRect();
            setDimensiones({ ancho: width, alto: height });
        }

    }, []);



    // useEffect(() => {
    //     console.log(dimensiones);
    // }, [dimensiones]);

    let grilla = []

    for (let i = 0; i < filas; i++) {
        for (let j = 0; j < columnas; j++) {
            grilla = [...grilla, { x: i, y: j }]
        }
    }

    // console.log(grilla);

    const alto = dimensiones.alto / filas
    const ancho = dimensiones.ancho / columnas





    return (
        <div className={`grilla-contenedor ${jugando ? 'mostrar' : ''}`}>

            <div className="grilla" ref={grillaRef} style={{
                gridTemplateColumns: `repeat(${columnas}, 1fr)`,
            }}>


                <Bot secuencia={secuencia} indiceActual={indice}
                    secuenciaProc1={secuenciaProc1} indiceActualProc1={indiceProc1}
                    ejecutando={ejecutando} sentido={sentido} reiniciar={reiniciar}
                    botAnimado={botAnimado} colisionArriba={colisionArriba}
                    colisionAbajo={colisionAbajo} colisionDerecha={colisionDerecha}
                    colisionIzquierda={colisionIzquierda} pos={pos} filas={filas} 
                    columnas={columnas}
                />


                {
                    grilla.map(actual => (
                        <Celda
                            key={`{${actual.x}, ${actual.y}}`}
                            alto={`${alto}px`}
                            ancho={`${ancho}px`}
                            // fondo= {textura(mapa[actual.x][actual.y])}
                            fondo={mapa[actual.x][actual.y] === 1 ? muroImg : ''}
                            colorFondo={colorFondo(mapa[actual.x][actual.y])}
                        />
                    ))
                }
                {/* <Bot estilosExtra={{tranform: `${tranformStyle}`}}  alto={alto / filas} ancho={ancho / columnas} /> */}



            </div>
        </div>

    )

}

export default Grilla