const fs=require('fs');const path=require('path');const cp=require('child_process');const r=path.resolve(__dirname,'..');const read=f=>fs.readFileSync(path.join(r,f),'utf8');const check=(ok,what)=>{if(!ok)throw new Error(what);console.log('OK '+what)};
for(const f of ['src/piramide-senati.js','src/recorrer.js','src/editor.js','src/simulator.js']){const p=path.join(r,f);check(cp.spawnSync(process.execPath,['--check',p]).status===0,f+' sin errores de sintaxis')}
const b=read('src/piramide-senati.js'),w=read('src/recorrer.js'),sim=read('src/simulator.js'),ed=read('src/editor.js');
check(b.includes('classroomDoors')&&b.includes('setClassroomDoorOpen'),'Puertas internas y paredes por piso');
check(b.includes('Azotea')&&b.includes('roof.visible'),'Cubierta del sexto piso');
check(ed.includes('floorCount:6')&&ed.includes('populatePyramidInterior'),'Seis pisos preequipados');
check(w.includes('function sitAtPC()')&&w.includes('function openPC()'),'Cámara sentada y función PC');
check(sim.includes('loadDemoScenario')&&sim.includes('initSimulatorScenarios'),'Demostración de simulación sin MySQL');
for(const f of ['recorrer.php','login.php','registro.php','admin.php'])check(fs.existsSync(path.join(r,f)),'Existe '+f);
check(read('recorrer.php').includes('id="pc-panel"'),'Interfaz de computadora');
for(const f of ['login.php','registro.php','admin.php','recorrer.php','simulador.php','index.php'])check(cp.spawnSync('php',['-l',path.join(r,f)]).status===0,f+' PHP válido');
console.log('PRUEBAS V5: APROBADAS. No sustituye una prueba visual o de MySQL.');
