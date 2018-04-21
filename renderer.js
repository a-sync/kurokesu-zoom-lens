// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const SerialPort = require('serialport');
const createTable = require('data-table');

const BAUDRATE = 112000;
const X_MAX = 55000;
const Y_MAX = 21000;

function refreshPorts() {
    SerialPort.list((err, ports) => {
        const targetPorts = document.getElementById('target-port');
        while (targetPorts.firstChild) {
            targetPorts.removeChild(targetPorts.firstChild);
        }

        console.log('ports', ports);
        if (err) {
            document.getElementById('error').textContent = err.message;
            return;
        }
        document.getElementById('error').textContent = '';

        if (ports.length === 0) {
            document.getElementById('error').textContent = 'No ports discovered';
        }

        const headers = Object.keys(ports[0]);
        const table = createTable(headers);
        let tableHTML = '';
        table.on('data', data => tableHTML += data);
        table.on('end', () => document.getElementById('ports').innerHTML = tableHTML);
        ports.forEach(port => {
            table.write(port);

            const opt = document.createElement('OPTION');
            opt.textContent = port.comName;
            opt.value = port.comName;
            document.getElementById('target-port').appendChild(opt);
        });
        table.end();
    });
}

module.exports.refreshPortList = refreshPorts;

const openedPorts = {};
function sendCommand() {
    const portVal = document.getElementById('target-port').value;

    const xRange = document.getElementById('x-range');
    const yRange = document.getElementById('y-range');

    if (!openedPorts[portVal]) {
        openedPorts[portVal] = new SerialPort(portVal, {
            baudRate: parseInt(BAUDRATE, 10)
        });

        // Open errors will be emitted as an error event
        openedPorts[portVal].on('error', err => {
            console.error('Error: ', err.message);
        });

        let lastLine = '';
        openedPorts[portVal].on('readable', err => {
            if (err) {
                console.error('Error: ', err.message);
            }

            const data = openedPorts[portVal].read().toString().split('\n');
            //console.log(data);

            if (data.length < 3) {
                return;
            }

            const line = data[data.length-2];

            if (line === lastLine) {
                return;
            }

            const feedback = {};
            const props = line.split(',');
            props.forEach(p => {
                const propParts = p.split('=');
                if (propParts.length === 2 && propParts[0] !== '' && propParts[1] !== '') {
                    feedback[propParts[0]] = propParts[1].trim();
                }
            });

            console.log(feedback);

            lastLine = line;

            //xRange.value = feedback['X'];
            //yRange.value = feedback['Y'];

            document.getElementById('feedback-x').textContent = feedback['X'];
            document.getElementById('feedback-y').textContent = feedback['Y'];
        });
    }

    const xVal = xRange.value;
    const yVal = yRange.value;

    openedPorts[portVal].write(`G0 X${xVal} Y${yVal}\n`, err => {
        if (err) {
            return console.error('Error on write: ', err.message);
        }

        console.info('command sent');
    });
}

module.exports.sendCommand = sendCommand;

function closePort() {
    const portVal = document.getElementById('target-port').value;

    if (!openedPorts[portVal]) {
        return;
    }

    openedPorts[portVal].close(err => {
        if (err) {
            console.error('Error: ', err);
        }
        delete openedPorts[portVal];
    }, console.error);
}

module.exports.closePort = closePort;

