import * as THREE from 'three';

export const materials = {
  wall: new THREE.MeshStandardMaterial({ color: 0xe6e9ed, roughness: .88 }),
  wallSide: new THREE.MeshStandardMaterial({ color: 0xd9d2c6, roughness: .95, transparent: true, opacity: .22, side: THREE.DoubleSide }),
  floor: new THREE.MeshStandardMaterial({ color: 0xd7dce2, roughness: .94 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0x8bc9e8, roughness: .18, metalness: .08, transparent: true, opacity: .58 }),
  frame: new THREE.MeshStandardMaterial({ color: 0xf4f1e9, roughness: .55 }),
  desk: new THREE.MeshStandardMaterial({ color: 0x173b67, roughness: .48 }),
  deskEdge: new THREE.MeshStandardMaterial({ color: 0x0b2747, roughness: .62 }),
  chair: new THREE.MeshStandardMaterial({ color: 0x15191f, roughness: .72 }),
  chairLeg: new THREE.MeshStandardMaterial({ color: 0x252a30, metalness: .3, roughness: .55 }),
  board: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .32 }),
  boardFrame: new THREE.MeshStandardMaterial({ color: 0x77818c, metalness: .3, roughness: .45 }),
  door: new THREE.MeshStandardMaterial({ color: 0x805537, roughness: .8 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x626c79, metalness: .65, roughness: .35 }),
  screen: new THREE.MeshStandardMaterial({ color: 0x101a2b, metalness: .12, roughness: .18, emissive: 0x071321, emissiveIntensity: .35 }),
  light: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.8 }),
  fan: new THREE.MeshStandardMaterial({ color: 0xe9edf2, metalness: .18, roughness: .45 }),
  skin: new THREE.MeshStandardMaterial({ color: 0xc58e69, roughness: .9 }),
  shirt: new THREE.MeshStandardMaterial({ color: 0x385d7e, roughness: .82 }),
  pants: new THREE.MeshStandardMaterial({ color: 0x303b4c, roughness: .9 })
};
