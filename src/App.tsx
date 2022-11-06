import React, {useEffect, useState} from 'react'
import reactLogo from './assets/react.svg'
import './App.css'

import * as Kilt from '@kiltprotocol/sdk-js'
import {createHash} from "./utils/sign-helpers";

export default function App() {
    const [count, setCount] = useState(0);
    const [did, setDid] = useState('');
    const [file, setFile] = useState();
    const [selectedFile, setSelectedFile] = useState<File>();

    const changeHandler = function (event: React.ChangeEvent<HTMLInputElement>) {
        const fileList = event.target.files;

        if (!fileList) return;

        setSelectedFile(fileList[0]);
    };

    useEffect(() => {
        const resolveWeb3Name = async () => {

            const api = await Kilt.connect('wss://spiritnet.kilt.io')
            const encodedDidDetails = await api.call.didApi.queryDidByW3n('john_doe')
            try {
                const {
                    document: {uri}
                } = Kilt.Did.linkedInfoFromChain(encodedDidDetails)
                setDid(uri)
            } catch {
                setDid('unknown')
            }
        }
        resolveWeb3Name()
    })

    function updateCount() {
        setCount(function (count) {
            return count + 1;
        });
    }

    async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
        const fileList = event.target.files;

        if (!fileList) return;

        const buffer = await fileList[0].arrayBuffer();
        const hash = await createHash(buffer);

        setFile(file);
    }

    const handleSubmission = function () {
        const formData = new FormData();

        // @ts-ignore
        formData.append('File', selectedFile, selectedFile?.name);

        fetch(
            'https://freeimage.host/api/1/upload?key=<YOUR_API_KEY>',
            {
                method: 'POST',
                body: formData,
            }
        )
            .then((response) => response.json())
            .then((result) => {
                console.log('Success:', result);
            })
            .catch((error) => {
                console.error('Error:', error);
            });
    };

    return (
        <div className="App">
            <div>
                <a href="https://vitejs.dev" target="_blank">
                    <img src="/vite.svg" className="logo" alt="Vite logo"/>
                </a>
                <a href="https://reactjs.org" target="_blank">
                    <img src={reactLogo} className="logo react" alt="React logo"/>
                </a>
            </div>
            <h1>Vite + React</h1>
            <div className="card">
                {did && (<div className="App" style={{"margin": "0px"}}>
                    <p className="read-the-docs"> john_doe is </p>
                    <button>{did}</button>
                </div>)}
            </div>
            <div className="card">
                <button onClick={updateCount}>
                    count is {count}
                </button>
            </div>
            <div className="card">
                <button>
                    <input type="file" name="file" onChange={changeHandler}/>
                </button>
                {selectedFile ? (
                    <div>
                        <p>File Name: {selectedFile.name}</p>
                        <p>File Type: {selectedFile.type}</p>
                        <p>File Size: {`${selectedFile.size} bytes`}</p>
                        <p>File Modified: {` ${selectedFile.lastModified}`} </p>
                    </div>
                ) : (
                    <p>Select a file to show details</p>
                )}
                <div>
                    <button onClick={handleSubmission}>Submit</button>
                </div>
            </div>
        </div>
    )
};