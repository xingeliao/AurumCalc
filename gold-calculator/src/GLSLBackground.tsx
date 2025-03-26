import React, { useRef, useEffect, useState } from "react";

// 片段着色器代码 - 可自定义各种视觉效果
const fragmentShaderSource = `
precision mediump float;

uniform vec2 uResolution;  // 画布尺寸
uniform float uTime;       // 当前时间
uniform vec2 uMouse;       // 鼠标位置
uniform vec3 uColorA;      // 自定义颜色A
uniform vec3 uColorB;      // 自定义颜色B
uniform float uIntensity;  // 效果强度

// 噪声函数
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// 分形噪声
float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 st) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 0.0;
    
    // 叠加多层噪声
    for(int i = 0; i < 5; i++) {
        value += amplitude * noise(st);
        st *= 2.0;
        amplitude *= 0.5;
    }
    
    return value;
}

void main() {
    // 标准化坐标
    vec2 st = gl_FragCoord.xy / uResolution.xy;
    vec2 pos = st * 2.0 - 1.0;
    pos.x *= uResolution.x / uResolution.y; // 修正宽高比
    
    // 计算到鼠标位置的距离
    vec2 mousePos = uMouse / uResolution.xy;
    mousePos = mousePos * 2.0 - 1.0;
    mousePos.x *= uResolution.x / uResolution.y;
    float mouseDist = length(pos - mousePos);
    
    // 创建动态波纹
    float time = uTime * 0.2;
    vec2 q = vec2(fbm(pos + time * 0.1), fbm(pos + vec2(1.0)));
    vec2 r = vec2(fbm(pos + q * 2.0 + vec2(1.7, 9.2) + time * 0.15), 
                 fbm(pos + q * 2.0 + vec2(8.3, 2.8) + time * 0.126));
    
    // 混合鼠标交互
    r += mouseDist * -0.2 * uIntensity;
    
    // 计算分形值
    float f = fbm(pos + r);
    
    // 混合两种颜色
    vec3 color = mix(uColorA, uColorB, f * f);
    
    // 增加亮度变化
    color += 0.07 * sin(pos.x * 10.0 + time) * sin(pos.y * 10.0 + time);
    
    // 边缘效果
    float edge = smoothstep(0.4, 0.5, distance(st, vec2(0.5)));
    color *= 1.0 - edge * 0.6;
    
    gl_FragColor = vec4(color, 1.0);
}
`;

// 顶点着色器代码 - 保持简单，创建覆盖整个画布的矩形
const vertexShaderSource = `
attribute vec4 aVertexPosition;

void main() {
    gl_Position = aVertexPosition;
}
`;

interface DynamicGLSLBackgroundProps {
    children?: React.ReactNode;
    colorA?: [number, number, number]; // RGB 颜色值 0-1
    colorB?: [number, number, number]; // RGB 颜色值 0-1
    intensity?: number;                // 效果强度 0-1
}

const DynamicGLSLBackground: React.FC<DynamicGLSLBackgroundProps> = ({
                                                                         children,
                                                                         colorA = [0.1, 0.3, 0.9],  // 默认深蓝色
                                                                         colorB = [0.8, 0.2, 0.8],  // 默认紫色
                                                                         intensity = 0.8
                                                                     }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>();
    const startTimeRef = useRef<number>(Date.now());
    const [mousePosition, setMousePosition] = useState<[number, number]>([0, 0]);
    const programRef = useRef<WebGLProgram | null>(null);
    const glRef = useRef<WebGLRenderingContext | null>(null);

    // 初始化WebGL
    const initGL = (canvas: HTMLCanvasElement) => {
        try {
            const gl = canvas.getContext("webgl", {
                alpha: false,
                antialias: true
            });

            if (!gl) throw new Error("WebGL not supported");
            return gl;
        } catch (e) {
            console.error("WebGL initialization error:", e);
            return null;
        }
    };

    // 编译着色器
    const compileShader = (
        gl: WebGLRenderingContext,
        source: string,
        type: number
    ) => {
        const shader = gl.createShader(type);
        if (!shader) return null;

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error("Shader compilation error:", gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    };

    // 创建着色器程序
    const createProgram = (
        gl: WebGLRenderingContext,
        vertexShader: WebGLShader,
        fragmentShader: WebGLShader
    ) => {
        const program = gl.createProgram();
        if (!program) return null;

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error("Program linking error:", gl.getProgramInfoLog(program));
            return null;
        }

        return program;
    };

    // 初始化缓冲区
    const initBuffers = (gl: WebGLRenderingContext) => {
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

        // 创建覆盖整个画布的矩形（使用两个三角形）
        const positions = [
            -1.0, -1.0,
            1.0, -1.0,
            -1.0,  1.0,
            1.0,  1.0,
        ];

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
        return positionBuffer;
    };

    // 处理鼠标移动
    const handleMouseMove = (event: MouseEvent) => {
        setMousePosition([event.clientX, event.clientY]);
    };

    // 处理触摸移动
    const handleTouchMove = (event: TouchEvent) => {
        if (event.touches.length > 0) {
            setMousePosition([event.touches[0].clientX, event.touches[0].clientY]);
        }
    };

    // 渲染场景
    const drawScene = (
        gl: WebGLRenderingContext,
        program: WebGLProgram,
        positionBuffer: WebGLBuffer,
        time: number
    ) => {
        // 设置视口和清除颜色
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // 启用着色器程序
        gl.useProgram(program);

        // 设置顶点位置属性
        const vertexPosition = gl.getAttribLocation(program, "aVertexPosition");
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.vertexAttribPointer(vertexPosition, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vertexPosition);

        // 设置 Uniform 变量
        // 1. 分辨率
        const resolutionLocation = gl.getUniformLocation(program, "uResolution");
        gl.uniform2f(resolutionLocation, gl.canvas.width, gl.canvas.height);

        // 2. 时间
        const timeLocation = gl.getUniformLocation(program, "uTime");
        gl.uniform1f(timeLocation, time);

        // 3. 鼠标位置
        const mouseLocation = gl.getUniformLocation(program, "uMouse");
        gl.uniform2f(mouseLocation, mousePosition[0], gl.canvas.height - mousePosition[1]); // Y轴反转

        // 4. 自定义颜色
        const colorALocation = gl.getUniformLocation(program, "uColorA");
        gl.uniform3fv(colorALocation, new Float32Array(colorA));

        const colorBLocation = gl.getUniformLocation(program, "uColorB");
        gl.uniform3fv(colorBLocation, new Float32Array(colorB));

        // 5. 强度
        const intensityLocation = gl.getUniformLocation(program, "uIntensity");
        gl.uniform1f(intensityLocation, intensity);

        // 绘制
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    // 主要初始化和渲染循环
    useEffect(() => {
        if (!canvasRef.current) return;

        // 调整canvas尺寸
        const resizeCanvas = () => {
            if (!canvasRef.current) return;

            const canvas = canvasRef.current;
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            if (glRef.current) {
                glRef.current.viewport(0, 0, canvas.width, canvas.height);
            }
        };

        // 初始化WebGL
        const gl = initGL(canvasRef.current);
        if (!gl) return;
        glRef.current = gl;

        // 编译着色器
        const vertexShader = compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
        const fragmentShader = compileShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);
        if (!vertexShader || !fragmentShader) return;

        // 创建程序
        const program = createProgram(gl, vertexShader, fragmentShader);
        if (!program) return;
        programRef.current = program;

        // 初始化缓冲区
        const positionBuffer = initBuffers(gl);

        // 设置画布尺寸
        resizeCanvas();

        // 添加事件监听
        window.addEventListener("resize", resizeCanvas);
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("touchmove", handleTouchMove, { passive: true });

        // 动画循环
        const animate = () => {
            const currentTime = (Date.now() - startTimeRef.current) / 1000;
            drawScene(gl, program, positionBuffer, currentTime);
            requestRef.current = requestAnimationFrame(animate);
        };

        // 开始动画
        requestRef.current = requestAnimationFrame(animate);

        // 清理函数
        return () => {
            window.removeEventListener("resize", resizeCanvas);
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("touchmove", handleTouchMove);

            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }

            if (gl) {
                gl.deleteProgram(program);
                gl.deleteShader(vertexShader);
                gl.deleteShader(fragmentShader);
            }
        };
    }, [colorA, colorB, intensity]);

    return (
        <>
            <canvas
                ref={canvasRef}
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    zIndex: -1,
                }}
            />
            {children}
        </>
    );
};

export default DynamicGLSLBackground;