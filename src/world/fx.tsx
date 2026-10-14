import { useMemo, useRef } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { world } from '../store'

/* 一颗会发光、带十字星芒的星星 */
const starFrag = /* glsl */ `
  uniform float uTime;
  uniform float uPulse;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv - 0.5;
    float d = length(p);
    float core = smoothstep(0.06, 0.0, d);
    float glow = exp(-d * 9.0) * 0.8;
    float sx = exp(-abs(p.y) * 120.0) * exp(-abs(p.x) * 7.0);
    float sy = exp(-abs(p.x) * 120.0) * exp(-abs(p.y) * 7.0);
    float pulse = 1.0 + sin(uTime * 2.4) * 0.18 * uPulse;
    float a = (core + glow + (sx + sy) * 0.9) * pulse;
    a *= smoothstep(0.5, 0.35, d);
    gl_FragColor = vec4(uColor * a, a);
  }
`
const uvVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`

export function GlowStar({
  size = 2,
  color = '#fff1c9',
  pulse = 1,
  ...props
}: { size?: number; color?: string; pulse?: number } & ThreeElements['group']) {
  const m = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: uvVert,
        fragmentShader: starFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        uniforms: { uTime: { value: 0 }, uPulse: { value: pulse }, uColor: { value: new THREE.Color(color).multiplyScalar(1.6) } },
      }),
    [color, pulse],
  )
  useFrame(({ clock }) => (m.uniforms.uTime.value = clock.elapsedTime))
  return (
    <group {...props}>
      <Billboard>
        <mesh material={m} scale={size}>
          <planeGeometry args={[1, 1]} />
        </mesh>
      </Billboard>
    </group>
  )
}

/* 从地面升起的一道柔光，标记可以去的地方 */
const pillarFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float fade = pow(clamp(1.0 - vUv.y, 0.0, 1.0), 2.2);
    float edge = sin(vUv.x * 3.14159 * 2.0) * 0.5 + 0.5;
    float flick = 0.85 + 0.15 * sin(uTime * 3.0 + vUv.y * 10.0);
    float a = fade * flick * 0.55 * uOpacity * (0.6 + 0.4 * edge);
    gl_FragColor = vec4(uColor * a, a);
  }
`
export function LightPillar({ color = '#ffe2a0', height = 7, radius = 0.45, opacity = 1 }: { color?: string; height?: number; radius?: number; opacity?: number }) {
  const m = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: uvVert,
        fragmentShader: pillarFrag,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        uniforms: { uColor: { value: new THREE.Color(color) }, uTime: { value: 0 }, uOpacity: { value: opacity } },
      }),
    [color, opacity],
  )
  useFrame(({ clock }) => (m.uniforms.uTime.value = clock.elapsedTime))
  return (
    <mesh material={m} position={[0, height / 2, 0]}>
      <cylinderGeometry args={[radius * 0.6, radius, height, 16, 1, true]} />
    </mesh>
  )
}

/* 萤火虫：黎明时渐渐熄灭 */
const ffVert = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  varying float vA;
  void main() {
    vec3 p = position;
    float t = uTime * 0.35 + aSeed * 40.0;
    p.x += sin(t * 1.1) * 0.8;
    p.y += sin(t * 1.7) * 0.35;
    p.z += cos(t * 0.9) * 0.8;
    vA = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(uTime * 2.0 + aSeed * 20.0), 3.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = 90.0 / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`
const ffFrag = /* glsl */ `
  uniform float uOpacity;
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    a = a * a * vA * uOpacity;
    gl_FragColor = vec4(vec3(0.95, 1.0, 0.55) * a * 1.8, a);
  }
`
export function Fireflies({ count = 140, radius = 11, height = [0.3, 3] as [number, number], ground }: { count?: number; radius?: number; height?: [number, number]; ground: (x: number, z: number) => number }) {
  const ref = useRef<THREE.Points>(null!)
  const { geo, m } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2
      const r = Math.sqrt(Math.random()) * radius
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r
      pos.set([x, ground(x, z) + height[0] + Math.random() * (height[1] - height[0]), z], i * 3)
      seed[i] = Math.random()
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    const m = new THREE.ShaderMaterial({
      vertexShader: ffVert,
      fragmentShader: ffFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 } },
    })
    return { geo, m }
  }, [count, radius, height, ground])
  useFrame(({ clock }) => {
    m.uniforms.uTime.value = clock.elapsedTime
    m.uniforms.uOpacity.value = THREE.MathUtils.clamp(1 - world.dawn * 1.3, 0, 1)
  })
  return <points ref={ref} geometry={geo} material={m} frustumCulled={false} />
}
