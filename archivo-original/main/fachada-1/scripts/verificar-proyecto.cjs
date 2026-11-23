const fs=require('fs');
const path=require('path');
const {spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..');
function get(file){return fs.readFileSync(path.join(root,file),'utf8');}
function assert(condition,message){if(!condition){console.error('ERROR:',message);process.exitCode=1;}else console.log('OK:',message);}
function checkPage(js,php){
 const source=get(`src/${js}.js`),page=get(php);
 const refs=[...source.matchAll(/\$\(['"]([\w-]+)['"]\)/g)].map(m=>m[1]);
 const ids=new Set([...page.matchAll(/\bid=["']([^"']+)["']/g)].map(m=>m[1]));
 const missing=[...new Set(refs)].filter(k=>!ids.has(k));
 assert(missing.length===0,`${js}: controles conectados ${missing.length?'Faltan '+missing.join(', '):''}`);
}
for(const file of ['index.php','simulador.php','src/editor.js','src/simulator.js','src/piramide-senati.js','src/navigation.js','src/scene-models.js','src/editor.css','api/scenarios.php','api/simulations.php','recorrer.php','login.php','registro.php','logout.php','admin.php','config/auth.php','database/usuarios.sql','src/recorrer.js','assets/recorrer.css','database/schema.sql','database/ACTUALIZAR_BD_EXISTENTE.sql','referencias/senati_frontal.jpg','referencias/senati_perspectiva.jpg']){
 assert(fs.existsSync(path.join(root,file)),`Existe: ${file}`);
}
checkPage('editor','index.php');checkPage('simulator','simulador.php');checkPage('recorrer','recorrer.php');
assert(get('src/editor.js').includes("$('pyramid-template').addEventListener"),'Plantilla Pirámide integrada al editor');
assert(get('src/simulator.js').includes('buildPiramideSENATI'),'Pirámide integrada al simulador');
assert(get('database/schema.sql').includes('CREATE TABLE IF NOT EXISTS simulation_runs'),'Base de datos: historial de simulaciones');
assert(get('database/schema.sql').includes('CREATE TABLE IF NOT EXISTS scenario_versions'),'Base de datos: versiones de escenarios');
assert(get('config/auth.php').includes('password')===false || get('login.php').includes('password_verify'),'Inicio de sesión con comprobación de contraseñas');
assert(get('api/scenarios.php').includes("$authUser['role']"),'API protegida con permisos de rol');
assert(get('src/piramide-senati.js').includes('Dos escaleras · comunicación vertical'),'Escalera estructural transitable');
assert(get('src/recorrer.js').includes('updateStairs'),'Cámara con subida de escaleras');
assert(get('src/piramide-senati.js').includes('EV52_WALL_SEGMENTS'),'Planta V9 modular implementada');
assert(get('src/ev52-layout.js').includes('ev52DeskPositions'),'Distribución de puestos EV-52 compartida');
assert(get('src/recorrer.js').includes('floorWallBoxes'),'Colisiones V9 para los seis pisos');
for(const file of ['editor','simulator','recorrer','piramide-senati','scene-models','navigation']){
 const result=spawnSync(process.execPath,['--check',path.join(root,'src',file+'.js')],{encoding:'utf8'});
 assert(result.status===0,`${file}.js: sintaxis válida`);
}
if(!process.exitCode)console.log('\nProyecto estructuralmente correcto. Falta compilar con npm run build si public/assets no existe.');
