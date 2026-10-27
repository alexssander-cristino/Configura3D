/**
 * Configura3D - Gerador do modelo 3D de demonstração (GLB 2.0 escrito manualmente).
 *
 * Gera um GLB simples de um "organizador de mesa" com MESHES SEPARADOS e
 * nomeados, para que o configurador troque o material de cada componente de
 * forma real (não é imagem estática).
 *
 * Componentes (nós/meshes nomeados):
 *  - "base"         -> base do organizador (cor configurável)
 *  - "gaveta"       -> gaveta (material configurável)
 *  - "prateleira"   -> prateleira (acabamento configurável)
 *
 * Saída: apps/web/public/models/demo-organizador.glb
 *
 * IDENTIFICADO COMO DEMONSTRAÇÃO - não é um modelo comercial real.
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const OUT_DIR = join(process.cwd(), 'apps/web/public/models');
const OUT_FILE = join(OUT_DIR, 'demo-organizador.glb');

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Helpers de geometria: caixa centrada na origem com 24 vértices (4 por face)
// para normais planas por face.
// ---------------------------------------------------------------------------

function boxVertices(w, h, d, tx = 0, ty = 0, tz = 0) {
  const hw = w / 2, hh = h / 2, hd = d / 2;
  // Cada face: 4 vértices + normal (normais planas por face)
  const faces = [
    { verts: [[hw, -hh, -hd], [hw, hh, -hd], [hw, hh, hd], [hw, -hh, hd]], n: [1, 0, 0] },      // +X
    { verts: [[-hw, -hh, hd], [-hw, hh, hd], [-hw, hh, -hd], [-hw, -hh, -hd]], n: [-1, 0, 0] }, // -X
    { verts: [[-hw, hh, -hd], [hw, hh, -hd], [hw, hh, hd], [-hw, hh, hd]], n: [0, 1, 0] },      // +Y
    { verts: [[-hw, -hh, hd], [hw, -hh, hd], [hw, -hh, -hd], [-hw, -hh, -hd]], n: [0, -1, 0] }, // -Y
    { verts: [[-hw, -hh, hd], [-hw, hh, hd], [hw, hh, hd], [hw, -hh, hd]], n: [0, 0, 1] },      // +Z
    { verts: [[hw, -hh, -hd], [hw, hh, -hd], [-hw, hh, -hd], [-hw, -hh, -hd]], n: [0, 0, -1] }, // -Z
  ];

  const positions = [];
  const normals = [];
  const uvs = [];

  for (let f = 0; f < 6; f++) {
    const { verts, n } = faces[f];
    for (let v = 0; v < 4; v++) {
      positions.push(verts[v][0] + tx, verts[v][1] + ty, verts[v][2] + tz);
      normals.push(n[0], n[1], n[2]);
      uvs.push(v === 0 || v === 3 ? 0 : 1, v === 0 || v === 1 ? 0 : 1);
    }
  }

  // Índices: 2 triângulos por face (12 triângulos, 36 índices)
  const indices = [];
  for (let f = 0; f < 6; f++) {
    const base = f * 4;
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices: new Uint16Array(indices),
  };
}

// ---------------------------------------------------------------------------
// Monta os três componentes
// ---------------------------------------------------------------------------

const baseGeo = boxVertices(1.2, 0.5, 0.9, 0, 0.25, 0); // base, levantada
const gavetaGeo = boxVertices(0.5, 0.4, 0.5, 0.32, 0.45, 0); // gaveta
const prateleiraGeo = boxVertices(1.1, 0.06, 0.85, 0, 0.05, 0); // prateleira

const materials = [
  { name: 'base-material', color: [0.553, 0.431, 0.388], metalness: 0.1, roughness: 0.7 }, // 0x8d6e63
  { name: 'gaveta-material', color: [0.365, 0.251, 0.216], metalness: 0.05, roughness: 0.8 }, // 0x5d4037
  { name: 'prateleira-material', color: [0.243, 0.153, 0.137], metalness: 0.1, roughness: 0.6 }, // 0x3e2723
];

const meshes = [
  { name: 'base', geo: baseGeo, materialIndex: 0 },
  { name: 'gaveta', geo: gavetaGeo, materialIndex: 1 },
  { name: 'prateleira', geo: prateleiraGeo, materialIndex: 2 },
];

// ---------------------------------------------------------------------------
// Concatena buffers de vértices e índices
// ---------------------------------------------------------------------------

const vertexChunks = [];
const indexChunks = [];
const vertexOffsets = []; // { meshIndex, byteOffset, count }
const indexOffsets = []; // { meshIndex, byteOffset, count }

let vertexByteOffset = 0;
let indexByteOffset = 0;

meshes.forEach((m, mi) => {
  const { positions, normals, uvs, indices } = m.geo;
  const vertCount = positions.length / 3;
  vertexOffsets.push({ meshIndex: mi, byteOffset: vertexByteOffset, count: vertCount });
  // POSITION + NORMAL + UV (interleaved não necessário; usamos accessores separados)
  const toBuf = (a) => Buffer.from(a.buffer, a.byteOffset, a.byteLength);
  vertexChunks.push(toBuf(positions));
  vertexChunks.push(toBuf(normals));
  vertexChunks.push(toBuf(uvs));
  vertexByteOffset += (positions.byteLength + normals.byteLength + uvs.byteLength);

  indexOffsets.push({ meshIndex: mi, byteOffset: indexByteOffset, count: indices.length });
  indexChunks.push(toBuf(indices));
  indexByteOffset += indices.byteLength;
});

const vertexBuffer = Buffer.concat(vertexChunks);
const indexBuffer = Buffer.concat(indexChunks);

// ---------------------------------------------------------------------------
// Escreve GLB
// ---------------------------------------------------------------------------

const json = {
  asset: { version: '2.0', generator: 'Configura3D Demo Model' },
  scene: 0,
  scenes: [
    { nodes: [0], name: 'Demo Scene' },
  ],
  nodes: [
    { name: 'organizador-de-mesa-demo', children: [1, 2, 3] }, // raiz
    { name: 'base', mesh: 0 },
    { name: 'gaveta', mesh: 1 },
    { name: 'prateleira', mesh: 2 },
  ],
  meshes: meshes.map((m, i) => ({
    name: m.name,
    primitives: [{
      attributes: {
        POSITION: 3 * i + 0,
        NORMAL: 3 * i + 1,
        TEXCOORD_0: 3 * i + 2,
      },
      indices: 9 + i, // accessor de índices (após 9 accessores de vértices)
      material: i,
      mode: 4, // TRIANGLES
    }],
  })),
  accessors: [
    // Para cada mesh: POSITION, NORMAL, TEXCOORD_0 (3 accessors por mesh)
    ...meshes.flatMap((m, i) => [
      {
        bufferView: i * 3 + 0, byteOffset: 0,
        componentType: 5126, // FLOAT
        count: m.geo.positions.length / 3,
        type: 'VEC3',
        max: [0, 0, 0], min: [0, 0, 0],
      },
      {
        bufferView: i * 3 + 1, byteOffset: 0,
        componentType: 5126, count: m.geo.normals.length / 3, type: 'VEC3',
        max: [0, 0, 0], min: [0, 0, 0],
      },
      {
        bufferView: i * 3 + 2, byteOffset: 0,
        componentType: 5126, count: m.geo.uvs.length / 2, type: 'VEC2',
        max: [0, 0], min: [0, 0],
      },
    ]),
    // Índices (3 accessors) -> bufferViews 9, 10, 11
    ...meshes.map((m, i) => ({
      bufferView: 9 + i, byteOffset: 0,
      componentType: 5123, // UNSIGNED_SHORT
      count: m.geo.indices.length,
      type: 'SCALAR',
      max: [0], min: [0],
    })),
  ],
  bufferViews: [
    // Para cada mesh: position, normal, uv bufferViews (3 por mesh): 0..8
    ...meshes.flatMap((m, i) => [
      { buffer: 0, byteOffset: vertexOffsets[i].byteOffset, byteLength: m.geo.positions.byteLength, byteStride: 0 },
      { buffer: 0, byteOffset: vertexOffsets[i].byteOffset + m.geo.positions.byteLength, byteLength: m.geo.normals.byteLength, byteStride: 0 },
      { buffer: 0, byteOffset: vertexOffsets[i].byteOffset + m.geo.positions.byteLength + m.geo.normals.byteLength, byteLength: m.geo.uvs.byteLength, byteStride: 0 },
    ]),
    // Índices -> bufferViews 9, 10, 11
    ...meshes.map((m, i) => ({ buffer: 0, byteOffset: indexOffsets[i].byteOffset, byteLength: m.geo.indices.byteLength, byteStride: 0 })),
  ],
  buffers: [
    { byteLength: vertexBuffer.length + indexBuffer.length },
  ],
  materials: materials.map((mat) => ({
    name: mat.name,
    pbrMetallicRoughness: {
      baseColorFactor: [...mat.color, 1],
      metallicFactor: mat.metalness,
      roughnessFactor: mat.roughness,
    },
  })),
};

// Calcular max/min para accessors POSITION (útil mas opcional)
// Aqui deixamos zeros (válido para glTF).

const jsonBytes = Buffer.from(JSON.stringify(json), 'utf8');
const jsonPadded = Buffer.alloc(Math.ceil(jsonBytes.length / 4) * 4, 0x20);
jsonBytes.copy(jsonPadded);

const binBuffer = Buffer.concat([vertexBuffer, indexBuffer]);
const binPadded = Buffer.alloc(Math.ceil(binBuffer.length / 4) * 4, 0);
binBuffer.copy(binPadded);

const header = Buffer.alloc(12);
header.write('glTF', 0, 'ascii');
header.writeUInt32LE(2, 4); // version
header.writeUInt32LE(
  12 + // header
  (8 + jsonPadded.length) + // chunk 0
  (8 + binPadded.length), // chunk 1
  8, // length
);

const chunk0Type = Buffer.from('JSON', 'ascii');
const chunk0Len = Buffer.alloc(4);
chunk0Len.writeUInt32LE(jsonPadded.length, 0);

const chunk1Type = Buffer.from([0x00, 0x4E, 0x49, 0x42]); // "BIN"
const chunk1Len = Buffer.alloc(4);
chunk1Len.writeUInt32LE(binPadded.length, 0);

const glb = Buffer.concat([
  header,
  chunk0Len, chunk0Type, jsonPadded,
  chunk1Len, chunk1Type, binPadded,
]);

writeFileSync(OUT_FILE, glb);
console.log(`Modelo de demonstração gerado: ${OUT_FILE}`);
console.log(`Tamanho: ${(glb.length / 1024).toFixed(1)} KB`);
console.log('Componentes (meshes/nós): base, gaveta, prateleira');
console.log('IDENTIFICADO COMO DEMONSTRAÇÃO - não é um modelo comercial real.');
