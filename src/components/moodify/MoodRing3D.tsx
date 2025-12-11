"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";

type Track = {
    id: string;
    title: string;
    artist: string;
    mood: string;
    moodConfidence?: number;
    titlePos?: number;
    valence?: number;
    energy?: number;
};

type MoodRing3DProps = {
    tracks: Track[];
    moodColors: Record<string, string>;
    overallMoodLabel: string;
    trackCount: number;
};

// Create custom torus segment geometry
function createTorusSegment(radius: number, tube: number, startAngle: number, endAngle: number, radialSegments: number = 32) {
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const angleRange = endRad - startRad;

    // Create vertices for the torus segment
    for (let i = 0; i <= radialSegments; i++) {
        const u = i / radialSegments;
        const angle = startRad + u * angleRange;
        const cosAngle = Math.cos(angle);
        const sinAngle = Math.sin(angle);

        for (let j = 0; j <= 16; j++) {
            const v = j / 16;
            const tubeAngle = v * Math.PI * 2;
            const cosTube = Math.cos(tubeAngle);
            const sinTube = Math.sin(tubeAngle);

            const x = (radius + tube * cosTube) * cosAngle;
            const y = tube * sinTube;
            const z = (radius + tube * cosTube) * sinAngle;

            vertices.push(x, y, z);

            const normal = new THREE.Vector3(
                cosTube * cosAngle,
                sinTube,
                cosTube * sinAngle
            ).normalize();
            normals.push(normal.x, normal.y, normal.z);

            uvs.push(u, v);
        }
    }

    // Create indices
    for (let i = 0; i < radialSegments; i++) {
        for (let j = 0; j < 16; j++) {
            const a = i * (16 + 1) + j;
            const b = a + 16 + 1;

            indices.push(a, b, a + 1);
            indices.push(b, b + 1, a + 1);
        }
    }

    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);

    return geometry;
}

// Torus segment component for each mood
function TorusSegment({
    startAngle,
    angle,
    color,
}: {
    startAngle: number;
    angle: number;
    color: string;
}) {
    const geometry = useMemo(() => {
        const geom = createTorusSegment(1, 0.2, startAngle, startAngle + angle);
        return geom;
    }, [startAngle, angle]);

    useEffect(() => {
        return () => {
            // Cleanup geometry on unmount
            if (geometry) {
                geometry.dispose();
            }
        };
    }, [geometry]);

    return (
        <mesh geometry={geometry}>
            <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.3}
                metalness={0.5}
                roughness={0.3}
            />
        </mesh>
    );
}

// Rotating ring group
function RotatingRing({
    segments,
    moodColors,
}: {
    segments: Array<{ mood: string; startAngle: number; angle: number }>;
    moodColors: Record<string, string>;
}) {
    const groupRef = useRef<THREE.Group>(null);
    const rotationSpeed = 0.3; // radians per second

    useFrame((state, delta) => {
        if (groupRef.current) {
            groupRef.current.rotation.y += rotationSpeed * delta;
        }
    });

    return (
        <group ref={groupRef}>
            {segments.map((segment, index) => {
                const color = moodColors[segment.mood.toLowerCase()] || moodColors["default"] || "#808080";

                return (
                    <TorusSegment
                        key={`${segment.mood}-${index}`}
                        startAngle={segment.startAngle}
                        angle={segment.angle}
                        color={color}
                    />
                );
            })}
        </group>
    );
}

// Scene component
function MoodRingScene({ tracks, moodColors, overallMoodLabel, trackCount }: MoodRing3DProps) {
    // Calculate segments based on mood distribution
    const segments = useMemo(() => {
        if (tracks.length === 0) {
            // Return a default gray segment if no tracks
            return [{
                mood: "default",
                startAngle: 0,
                angle: 360,
            }];
        }

        // Count moods
        const moodCounts = tracks.reduce((acc, track) => {
            const mood = track.mood.toLowerCase();
            acc[mood] = (acc[mood] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Sort moods by count for consistent ordering
        const sortedMoods = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]);

        // Calculate angle ranges
        let currentAngle = 0;
        const segmentData = sortedMoods.map(([mood, count]) => {
            const percentage = (count / tracks.length) * 100;
            const angle = (percentage / 100) * 360;
            const startAngle = currentAngle;
            currentAngle += angle;

            return {
                mood,
                startAngle,
                angle: Math.max(angle, 1), // Ensure minimum angle for visibility
            };
        });

        // Ensure we complete the full circle (handle rounding errors)
        const totalAngle = segmentData.reduce((sum, seg) => sum + seg.angle, 0);
        if (totalAngle < 360 && segmentData.length > 0) {
            const lastSegment = segmentData[segmentData.length - 1];
            lastSegment.angle += (360 - totalAngle);
        }

        return segmentData;
    }, [tracks]);

    return (
        <>
            {/* Lighting */}
            <ambientLight intensity={0.5} />
            <directionalLight position={[5, 5, 5]} intensity={1} />
            <directionalLight position={[-5, -5, -5]} intensity={0.5} />
            <pointLight position={[0, 10, 0]} intensity={0.3} />

            {/* Camera */}
            <PerspectiveCamera makeDefault position={[0, 0, 4.5]} fov={50} />

            {/* Controls */}
            <OrbitControls
                enableZoom={false}
                enablePan={false}
                minPolarAngle={Math.PI / 3}
                maxPolarAngle={Math.PI / 3}
                autoRotate={false}
            />

            {/* Rotating ring */}
            <RotatingRing segments={segments} moodColors={moodColors} />
        </>
    );
}

// Main component with Canvas
export default function MoodRing3D({
    tracks,
    moodColors,
    overallMoodLabel,
    trackCount,
}: MoodRing3DProps) {
    const [webglSupported, setWebglSupported] = useState(true);

    useEffect(() => {
        // Check WebGL support
        const canvas = document.createElement("canvas");
        const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
        setWebglSupported(!!gl);
    }, []);

    // Create 2D gradient fallback
    const createGradientFallback = () => {
        if (tracks.length === 0) return "conic-gradient(#808080 0deg 360deg)";
        
        const moodCounts = tracks.reduce((acc, track) => {
            const mood = track.mood.toLowerCase();
            acc[mood] = (acc[mood] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        const sortedMoods = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]);
        let currentAngle = 0;
        const gradientStops: string[] = [];
        
        sortedMoods.forEach(([mood, count]) => {
            const percentage = (count / tracks.length) * 100;
            const angle = (percentage / 100) * 360;
            const color = moodColors[mood] || moodColors["default"] || "#808080";
            const endAngle = currentAngle + angle;
            gradientStops.push(`${color} ${currentAngle}deg ${endAngle}deg`);
            currentAngle = endAngle;
        });
        
        return `conic-gradient(${gradientStops.join(", ")})`;
    };

    if (!webglSupported) {
        // Fallback to 2D visualization
        return (
            <div className="relative w-48 h-48 md:w-64 md:h-64">
                <div 
                    className="w-full h-full rounded-full shadow-lg"
                    style={{ background: createGradientFallback() }}
                />
            </div>
        );
    }

    return (
        <div className="relative w-48 h-48 md:w-64 md:h-64">
            <Canvas
                className="w-full h-full"
                gl={{ antialias: true, alpha: true }}
                dpr={[1, 2]}
            >
                <MoodRingScene
                    tracks={tracks}
                    moodColors={moodColors}
                    overallMoodLabel={overallMoodLabel}
                    trackCount={trackCount}
                />
            </Canvas>
        </div>
    );
}

