// Ink outlines + sepia paper finish, so the whole frame reads like Amara's illustration.
// Made by KiteRandel.
import * as THREE from 'three';

export class InkPass {
  constructor(renderer) {
    this.r = renderer;
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    this.main = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(size.x, size.y) });
    this.normals = new THREE.WebGLRenderTarget(size.x, size.y);
    this.normalMat = new THREE.MeshNormalMaterial();
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: this.main.texture }, tNormal: { value: this.normals.texture }, tDepth: { value: this.main.depthTexture },
        res: { value: size.clone() }, near: { value: 0.1 }, far: { value: 200 }, time: { value: 0 },
        ink: { value: new THREE.Color('#3a2a26') }, grade: { value: 0.32 }, flash: { value: 0 }, lineScale: { value: 1 },
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
      fragmentShader: /* glsl */`
        uniform sampler2D tColor, tNormal, tDepth; uniform vec2 res; uniform float near, far, time, grade, flash, lineScale; uniform vec3 ink;
        varying vec2 vUv;
        float lin(float d){ float z = d * 2. - 1.; return (2. * near * far) / (far + near - z * (far - near)); }
        float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        vec3 sepia(float l){
          vec3 a = vec3(0.23, 0.16, 0.15), b = vec3(0.57, 0.48, 0.44), c = vec3(0.94, 0.90, 0.85);
          return l < 0.5 ? mix(a, b, l * 2.) : mix(b, c, (l - .5) * 2.);
        }
        void main(){
          vec2 px = lineScale / res;
          vec3 n0 = texture2D(tNormal, vUv).xyz * 2. - 1.;
          float d0 = lin(texture2D(tDepth, vUv).x);
          float e = 0.;
          for (int i = 0; i < 4; i++) {
            vec2 o = i == 0 ? vec2(px.x, 0.) : i == 1 ? vec2(-px.x, 0.) : i == 2 ? vec2(0., px.y) : vec2(0., -px.y);
            vec3 n = texture2D(tNormal, vUv + o).xyz * 2. - 1.;
            float d = lin(texture2D(tDepth, vUv + o).x);
            e = max(e, (1. - dot(n0, n)) * 1.4);
            e = max(e, abs(d - d0) / max(d0, 0.001) * 18.);
          }
          e = smoothstep(0.25, 0.7, e) * (1. - smoothstep(35., 90., d0)) * 0.85;
          vec3 col = texture2D(tColor, vUv).rgb;
          float l = dot(col, vec3(0.299, 0.587, 0.114));
          col = mix(col, sepia(l) * (col / max(l, 0.001) * 0.25 + 0.75), grade);
          col = mix(col, ink, e);
          // paper grain + vignette
          float g = hash(vUv * res + floor(time * 8.)) - 0.5;
          col += g * 0.035;
          vec2 q = vUv - 0.5; col *= 1. - dot(q, q) * 0.55;
          col = mix(col, vec3(1., 0.95, 0.88), flash);
          gl_FragColor = vec4(col, 1.);
          gl_FragColor = linearToOutputTexel(gl_FragColor);
        }`,
      depthTest: false, depthWrite: false,
    }));
    this.quad.frustumCulled = false;
    this.scene2 = new THREE.Scene(); this.scene2.add(this.quad);
    this.cam2 = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
  setSize() {
    const size = this.r.getDrawingBufferSize(new THREE.Vector2());
    this.main.setSize(size.x, size.y); this.normals.setSize(size.x, size.y);
    this.quad.material.uniforms.res.value.copy(size);
    this.quad.material.uniforms.lineScale.value = Math.max(1, size.y / 900);
  }
  render(scene, camera, time) {
    const u = this.quad.material.uniforms; u.near.value = camera.near; u.far.value = camera.far; u.time.value = time;
    const r = this.r; const bg = scene.background; const fog = scene.fog;
    // 1) colors (all layers)
    camera.layers.enableAll(); r.setRenderTarget(this.main); r.render(scene, camera);
    // 2) normals of the outlined things only (layer 0), no sky, no particles
    camera.layers.set(0); scene.background = null; scene.fog = null; scene.overrideMaterial = this.normalMat;
    r.setRenderTarget(this.normals); r.setClearColor(0x000000, 0); r.clear(); r.render(scene, camera);
    scene.overrideMaterial = null; scene.background = bg; scene.fog = fog; camera.layers.enableAll();
    // 3) composite to screen
    r.setRenderTarget(null); r.render(this.scene2, this.cam2);
  }
}
