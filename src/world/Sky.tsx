import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { world, SUN_DIR, MOON_DIR } from '../store'

const skyVert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    vec4 p = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * p;
  }
`
const skyFrag = /* glsl */ `
  uniform float uDawn;
  uniform vec3 uSun;
  uniform vec3 uMoon;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    vec3 nightTop = vec3(0.025, 0.04, 0.12);
    vec3 nightMid = vec3(0.07, 0.10, 0.25);
    vec3 nightHor = vec3(0.20, 0.24, 0.45);
    vec3 dawnTop = vec3(0.32, 0.45, 0.72);
    vec3 dawnMid = vec3(0.86, 0.62, 0.66);
    vec3 dawnHor = vec3(1.0, 0.72, 0.50);
    float a = smoothstep(-0.15, 0.12, h);
    float b = smoothstep(0.08, 0.7, h);
    vec3 night = mix(mix(nightHor, nightMid, a), nightTop, b);
    vec3 dawn = mix(mix(dawnHor, dawnMid, a), dawnTop, b);
    float sunSide = max(dot(d, uSun), 0.0);
    dawn = mix(dawn, vec3(1.0, 0.80, 0.55), pow(sunSide, 3.0) * 0.6 * (1.0 - b));
    vec3 col = mix(night, dawn, uDawn);
    col += vec3(1.0, 0.72, 0.45) * pow(sunSide, 64.0) * 0.45 * uDawn;
    col += vec3(1.0, 0.93, 0.78) * smoothstep(0.9990, 0.9995, sunSide) * 1.3 * smoothstep(0.35, 0.8, uDawn);
    float moonSide = max(dot(d, uMoon), 0.0);
    col += vec3(0.55, 0.65, 0.9) * pow(moonSide, 40.0) * 0.35 * (1.0 - uDawn);
    gl_FragColor = vec4(col, 1.0);
  }
`

const starVert = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  uniform float uTime;
  varying float vTw;
  void main() {
    vTw = 0.6 + 0.4 * sin(uTime * (0.8 + aPhase) + aPhase * 30.0);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (0.75 + 0.25 * vTw);
    gl_Position = projectionMatrix * mv;
  }
`
const starFrag = /* glsl */ `
  uniform float uOpacity;
  varying float vTw;
  void main() {
    float r = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, r);
    a = pow(a, 2.0);
    gl_FragColor = vec4(vec3(1.0, 0.95, 0.85), a * vTw * uOpacity);
  }
`

export function Sky() {
  const group = useRef<THREE.Group>(null!)
  const skyMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: skyVert,
        fragmentShader: skyFrag,
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: { uDawn: { value: 0 }, uSun: { value: SUN_DIR }, uMoon: { value: MOON_DIR } },
      }),
    [],
  )
  const starMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: starVert,
        fragmentShader: starFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 } },
      }),
    [],
  )
  const starGeo = useMemo(() => {
    const n = 2200
    const pos = new Float32Array(n * 3)
    const size = new Float32Array(n)
    const phase = new Float32Array(n)
    const v = new THREE.Vector3()
    for (let i = 0; i < n; i++) {
      v.randomDirection()
      v.y = Math.abs(v.y) * 0.95 + 0.02
      v.normalize().multiplyScalar(420)
      pos.set([v.x, v.y, v.z], i * 3)
      size[i] = Math.random() < 0.06 ? 5 + Math.random() * 4 : 1.5 + Math.random() * 2.2
      phase[i] = Math.random()
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
    g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1))
    return g
  }, [])
  const moonMat = useRef<THREE.MeshBasicMaterial>(null!)

  useFrame(({ camera, clock }) => {
    group.current.position.copy(camera.position)
    skyMat.uniforms.uDawn.value = world.dawn
    starMat.uniforms.uTime.value = clock.elapsedTime
    starMat.uniforms.uOpacity.value = THREE.MathUtils.clamp(1 - world.dawn * 1.4, 0, 1)
    moonMat.current.opacity = 1 - world.dawn * 0.85
  })

  return (
    <group ref={group} renderOrder={-10}>
      <mesh material={skyMat} frustumCulled={false}>
        <sphereGeometry args={[480, 48, 24]} />
      </mesh>
      <points geometry={starGeo} material={starMat} frustumCulled={false} />
      <mesh position={MOON_DIR.clone().multiplyScalar(400)} ref={(m) => m?.lookAt(0, 0, 0)}>
        <circleGeometry args={[14, 48]} />
        <meshBasicMaterial ref={moonMat} color={'#fff6dd'} transparent toneMapped={false} fog={false} />
      </mesh>
    </group>
  )
}
