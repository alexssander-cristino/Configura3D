declare module 'three/examples/jsm/loaders/GLTFLoader' {
  import { Loader, LoadingManager } from 'three';
  export class GLTFLoader extends Loader {
    constructor(manager?: LoadingManager);
    load(
      url: string,
      onLoad: (gltf: any) => void,
      onProgress?: (event: ProgressEvent) => void,
      onError?: (event: ErrorEvent) => void,
    ): void;
    parse(data: any, path: string, onLoad: (gltf: any) => void, onError?: (event: ErrorEvent) => void): void;
  }
}
