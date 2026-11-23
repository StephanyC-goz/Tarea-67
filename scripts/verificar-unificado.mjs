import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const at=relative=>resolve(root,relative);
const bytes=relative=>readFileSync(at(relative));
const text=relative=>bytes(relative).toString('utf8');
const required=[
  'login.php','registro.php','index.php','recorrer.php','simulador.php','admin.php',
  'config/auth.php','config/database.php','database/schema.sql',
  'src/piramide-senati.js','src/recorrer.js','src/primer-piso-frente.js',
  'src/exterior-campus.js','src/exterior-navigation.js','src/exterior-preview.js',
  'PANEL_UNIFICADO.html','FACHADA_EXTERIOR.html','GUIA_PROYECTO_UNIFICADO.md',
  'INSTALAR_UNIFICADO.ps1','public/assets/editor.js','public/assets/recorrer.js',
  'modulos/fachada-original/FACHADA_EXTERIOR.html',
  'modulos/fachada-original/src/exterior-campus.js',
  'modulos/fachada-original/public/assets/exterior-preview.js',
  'archivo-original/.htaccess','archivo-original/MANIFIESTO_ORIGINALES.json'
];
for(const name of required){
  assert(existsSync(at(name)),`No se encuentra el archivo requerido: ${name}`);
  assert(statSync(at(name)).size>0,`Archivo vacio: ${name}`);
}
const manifest=JSON.parse(text('archivo-original/MANIFIESTO_ORIGINALES.json'));
assert.equal(manifest.schema,1,'Version de manifiesto reconocida');
assert.equal(manifest.branches.length,2,'Ambas ramas originales representadas');
let total=0;
for(const original of manifest.branches){
  assert(['main','piramide-v11'].includes(original.name),'Rama autorizada');
  for(const item of original.files){
    assert(!item.path.startsWith('/')&&!item.path.includes('..'),'Ruta relativa segura');
    const source=`archivo-original/${original.name}/${item.path}`;
    const data=bytes(source);
    assert.equal(data.length,item.size,`Archivo incompleto: ${source}`);
    // Git SHA-1 para blobs: SHA1("blob <size>\\0" + bytes).
    const sha=createHash('sha1').update(`blob ${data.length}\\0`).update(data).digest('hex');
    assert.equal(sha,item.sha,`Archivo original modificado: ${source}`);
    if(original.name==='main'&&item.path.startsWith('fachada-1/')){
      const facade='modulos/fachada-original/'+item.path.slice('fachada-1/'.length);
      assert(bytes(facade).equals(data),`Modulo fachada alterado: ${facade}`);
    }
    total++;
  }
}
assert.equal(total,286,'Se conservan los 162 archivos main y los 124 de V11');
const src=text('src/piramide-senati.js');
assert(src.includes('f===0?firstFloorPlan.walls:wallSegments'),'Primer piso frontal separado');
assert(src.includes('f===0?firstFloorPlan.doors:doors'),'Puertas frontales aisladas');
const php=text('registro.php');
assert(php.includes("require_once __DIR__.'/config/auth.php'"),'Registro importa autenticacion comun');
assert(text('database/schema.sql').includes('CREATE DATABASE IF NOT EXISTS aula3d'),'Esquema MySQL disponible');
assert(text('PANEL_UNIFICADO.html').includes('modulos')===false || text('FACHADA_EXTERIOR.html').includes('modulos/fachada-original'),'Enlaces de fachada');
for(const name of ['src/primer-piso-frente.js','src/exterior-campus.js','src/exterior-navigation.js','src/exterior-preview.js','scripts/verificar-unificado.mjs'])
  execFileSync(process.execPath,['--check',at(name)],{stdio:'pipe'});
console.log(`UNIFICADO OK: ${total} archivos historicos verificados con SHA Git, modulo fachada original sin cambios, motor principal, login, base aula3d y recursos presentes.`);
