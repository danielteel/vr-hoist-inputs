import './App.css';
import { useEffect, useState } from 'react';

function App() {
    const [radAlt, setRadAlt] = useState(255);
    const [hoistOutLength, setHoistOutLength] = useState(0);
    const [gameConnected, setGameConnected] = useState(false);

    useEffect( () => {
        let timeoutId = null;
        const fetchData = () => {
            fetch('http://192.168.1.5:3000/data').then(result => {
                if (result.status!==200) throw Error("bad status code");
                return result.json();
            }).then(data=>{
                setGameConnected( true );
                setRadAlt( () => data.radAlt===255?'inop':data.radAlt*2 );
                setHoistOutLength( () => data.hoistOutLength );
                console.log(data);
                timeoutId=setTimeout( fetchData, 500);//game is connected to request faster
            }).catch( ()=>{
                setGameConnected( false );
                timeoutId=setTimeout( fetchData, 1000);//game is not connected so wait a little before reattempting
            });
        }
        timeoutId=setTimeout( fetchData, 1000);

        return () => clearTimeout(timeoutId);
    }, []);

    return (
        <div className="App">
            <header className="App-header">
                VR Hoist Demo WebUI
            </header>
            {
                gameConnected ?
                    <>
                        <button type='button' onClick={()=>{
                            fetch('http://192.168.1.5:3000/reset').then(()=>{});
                        }}>Reset Level</button>

                        <div>
                            Rad alt: {radAlt}
                        </div>
                        <div>
                            Hoist out length: {hoistOutLength}
                        </div>
                    </>
                :
                    <div>Game not connected</div>
            }

        </div>
    );
}

export default App;
