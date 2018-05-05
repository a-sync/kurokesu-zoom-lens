// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const SerialPort = require('serialport');
const Readline = SerialPort.parsers.Readline;

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

        console.log('PORTS: ', ports);
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

    const xVal = document.getElementById('x-range').value;
    const yVal = document.getElementById('y-range').value;

    if (!openedPorts[portVal]) {
        openedPorts[portVal] = new SerialPort(portVal, {
            baudRate: parseInt(BAUDRATE, 10)
        });

        openedPorts[portVal].on('open', () => {
            console.log(portVal + ' OPENED');

            setMotorsPositions({
                comName: portVal,
                x: xVal,
                y: yVal
            });
        });

        // Open errors will be emitted as an error event
        openedPorts[portVal].on('error', err => {
            console.error('Error: ', err.message);
        });

        const parser = openedPorts[portVal].pipe(new Readline({ delimiter: '!' }));
        let lastLine = '';
        parser.on('data', line => {
            if (!line || line === lastLine || line.charAt(0) !== ',' || line.indexOf('\n') !== line.length-1) {
                return;
            }
            lastLine = line;
            console.log(line);

            const feedback = {};
            const props = line.split(',');
            props.forEach(p => {
                const propParts = p.split('=');
                if (propParts.length === 2 && propParts[0] !== '' && propParts[1] !== '') {
                    feedback[propParts[0]] = propParts[1].trim();
                }
            });

            //console.log(feedback);
            //xRange.value = feedback['X'];
            //yRange.value = feedback['Y'];

            document.getElementById('feedback').textContent = JSON.stringify(feedback, null, 2);
        });
    } else {
        setMotorsPositions({
            comName: portVal,
            x: xVal,
            y: yVal
        });
    }
}
module.exports.sendCommand = sendCommand;

/**
 * G0
 * Move motors to new position
 * Example [G0 X100 Y100] - to move motors to new position
 * @param comName
 * @param x
 * @param y
 */
function setMotorsPositions({comName, x=0, y=0}) {
    if (!openedPorts[comName]) {
        console.warn(comName + ' not available.', x, y);
        return;
    }

    openedPorts[comName].write(`G0 X${x} Y${y}\n`, err => {
        if (err) {
            return console.error('Error on write: ', err.message);
        }

        console.info('POSITION SENT', x, y);
    });
}

/**
 * G92
 * Set position to defined
 * Example [G92 X0 Y0] - to set current position as 0
 * @param comName
 * @param x
 * @param y
 */
function setMotorsCurrentPositions({comName, x=0, y=0}) {
    if (!openedPorts[comName]) {
        console.warn(comName + ' not available.', x, y);
        return;
    }

    openedPorts[comName].write(`G92 X${x} Y${y}\n`, err => {
        if (err) {
            return console.error('Error on write: ', err.message);
        }

        console.info('SET CURRENT POSITION SENT', x, y);
    });
}

/**
 * M0
 * Instant stop
 * Example [M0]
 * @param comName
 */
function stopMotors({comName}) {
    if (!openedPorts[comName]) {
        console.warn(comName + ' not available.', 'stop');
        return;
    }

    openedPorts[comName].write(`M0\n`, err => {
        if (err) {
            return console.error('Error on write: ', err.message);
        }

        console.info('STOP SENT');
    });
}

/**
 * M98
 * Experimental set motor power
 * Example [M98 R1]
 * R1 -> 33% (default)
 * R2 -> 50%
 * R3 -> 67%
 * R4 -> 100%
 * @param comName
 * @param power
 */
function setMotorsMovementPower({comName, power=1}) {
    if (!openedPorts[comName]) {
        console.warn(comName + ' not available.', power);
        return;
    }

    openedPorts[comName].write(`M98 R${power}\n`, err => {
        if (err) {
            return console.error('Error on write: ', err.message);
        }

        console.info('SET POWER SENT', power);
    });
}

/**
 * M99
 * Experimental set movement speed
 * Example [M99 R100], default R=600, The smaller value, the faster motion
 * @param comName
 * @param speed
 */
function setMotorsMovementSpeed({comName, speed=600}) {
    if (!openedPorts[comName]) {
        console.warn(comName + ' not available.', speed);
        return;
    }

    openedPorts[comName].write(`M99 R${speed}\n`, err => {
        if (err) {
            return console.error('Error on write: ', err.message);
        }

        console.info('SET SPEED SENT', speed);
    });
}

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

function stop() {
    const comName = document.getElementById('target-port').value;
    stopMotors({comName});
}
module.exports.stop = stop;

function setSpeed(speed) {
    const comName = document.getElementById('target-port').value;
    setMotorsMovementSpeed({comName, speed});
}
module.exports.setSpeed = setSpeed;

function setPower(power) {
    const comName = document.getElementById('target-port').value;
    setMotorsMovementPower({comName, power});
}
module.exports.setPower = setPower;

function setZero() {
    const comName = document.getElementById('target-port').value;
    setMotorsCurrentPositions({comName, x: 0, y: 0});
}
module.exports.setZero = setZero;
