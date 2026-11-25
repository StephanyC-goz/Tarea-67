import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import * as THREE from 'three';
import {QUALITY_PRESETS,normalizeQuality,recommendedQuality,
  applyGraphicsQuality,createPolishedFloorTexture} from '../src/calidad-grafica.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const file=f=>readFileSync(resolve(root,f),'utf8');
assert.equal(Object.keys(QUALITY_PRESETS).length,4,'Cuatro modos de calidad');
assert.equal(normalizeQuality('invalido','equilibrado'),'equilibrado');
assert.equal(recommendedQuality({mobile:true}),'equilibrado');
assert.equal(recommendedQuality({mobile:false}),'alto');
assert.equal(createPolishedFloorTexture(),null,'El modulo no exige DOM en los tests Node');
for(const [name,config] of Object.entries(QUALITY_PRESETS)){
  let pixelRatio=0,shadowSize=0,projectionUpdated=false;
  const renderer={
    setPixelRatio(v){pixelRatio=v;},
    capabilities:{maxTextureSize:2048},
    shadowMap:{enabled:false,needsUpdate:false}
  };
  const sun={
    castShadow:false,
    shadow:{
      mapSize:{set(w,h){assert.equal(w,h);shadowSize=w;}},
      camera:{updateProjectionMatrix(){projectionUpdated=true;}},
      map:null
    }
  };
  const active=applyGraphicsQuality({renderer,sun,shadowRadius:56},name);
  assert.equal(active,name);
  assert.equal(renderer.toneMapping,THREE.ACESFilmicToneMapping);
  assert.equal(renderer.outputColorSpace,THREE.SRGBColorSpace);
  assert.equal(renderer.shadowMap.enabled,config.enabled);
  assert.equal(sun.castShadow,config.enabled);
  assert.equal(renderer.shadowMap.type,THREE.PCFSoftShadowMap);
  assert.equal(shadowSize,Math.min(config.shadow,2048));
  assert(pixelRatio>0&&pixelRatio<=config.dpr);
  assert.equal(sun.shadow.camera.left,-56);
  assert.equal(sun.shadow.camera.right,56);
  assert(projectionUpdated&&renderer.shadowMap.needsUpdate);
}
for(const scene of ['src/editor.js','src/recorrer.js','src/simulator.js']){
  assert(file(scene).includes("mountGraphicsQuality("),scene+' usa la configuracion común');
}
assert(file('src/piramide-senati.js').includes('createPolishedFloorTexture()'),'Losas con textura de baldosa');
assert(file('src/recorrer.js').includes('frameSamples*1000'),'FPS visible sin bucles extra');
for(const f of ['src/calidad-grafica.js','src/piramide-senati.js','src/editor.js',
  'src/recorrer.js','src/simulator.js','scripts/verificar-graficos.mjs']){
  execFileSync(process.execPath,['--check',resolve(root,f)],{stdio:'pipe'});
}
console.log('GRAFICOS OK: cuatro presets, sombras, resolución, materiales, editor, recorrido y simulador.');
