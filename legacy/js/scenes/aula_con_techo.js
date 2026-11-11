import * as THREE from 'three';
import { crearPisoYMuros } from '../objects/paredes.js';
import { crearMobiliario, crearPizarra } from '../objects/mobiliario.js';
import { crearPersonas, crearVentiladores, crearFluorescentes, crearProyector } from '../objects/equipamiento.js';

export function crearEscenaConTecho(){
 const g=new THREE.Group();g.name='Aula con techo';
 crearPisoYMuros(g,{roof:true});crearPizarra(g);crearMobiliario(g);
 g.add(crearPersonas(),crearVentiladores(),crearFluorescentes(),crearProyector());
 return g;
}
