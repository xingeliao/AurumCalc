// SimpleGLSLBackground.tsx
import React, { useRef, useEffect } from "react";

// 简单的片段着色器代码
const fragmentShaderSource = `
precision highp float;
uniform float time;
uniform vec2 resolution;
void main( void ) {
	vec2 position = ( gl_FragCoord.xy / resolution.xy );
	float color = 0.0;
	color += sin( position.x * cos( time / 15.0 ) * 80.0 ) + cos( position.y * cos( time / 15.0 ) * 10.0 );
	color += sin( position.y * sin( time / 10.0 ) * 40.0 ) + cos( position.x * sin( time / 25.0 ) * 40.0 );
	color += sin( position.x * sin( time / 5.0 ) * 10.0 ) + sin( position.y * sin( time / 35.0 ) * 80.0 );
	color *= sin( time / 10.0 ) * 0.5;
	gl_FragColor = vec4( vec3( color, color * 0.5, sin( color + time / 3.0 ) * 0.75 ), 1.0 );
}
`;

// 顶点着色器代码
const vertexShaderSource = `
attribute vec4 aVertexPosition;

void main(void) {
  gl_Position = aVertexPosition;
}
`;

interface SimpleGLSLBackgroundProps {
    children?: React.ReactNode;
}

const SimpleGLSLBackground: React.FC<SimpleGLSLBackgroundProps> = ({ children }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // @ts-ignore
    const requestRef = useRef<number>();
    const startTimeRef = useRef<number>(Date.now());

    // 初始化WebGL
    const initGL = (canvas: HTMLCanvasElement) => {
        try {
            const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
            if (!gl) throw new Error("WebGL不支持");
            return gl as WebGLRenderingContext;
        } catch (e) {
            console.error("WebGL初始化错误:", e);
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
        if (!shader) {
            console.error("无法创建着色器对象");
            return null;
        }

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error("着色器编译错误:", gl.getShaderInfoLog(shader));
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
        if (!program) {
            console.error("无法创建程序对象");
            return null;
        }

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error("程序链接错误:", gl.getProgramInfoLog(program));
            return null;
        }

        return program;
    };

    // 初始化缓冲区
    const initBuffers = (gl: WebGLRenderingContext) => {
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

        // 创建一个覆盖整个画布的矩形
        const positions = [
            -1.0, -1.0,  // 左下
            1.0, -1.0,  // 右下
            -1.0,  1.0,  // 左上
            1.0,  1.0,  // 右上
        ];

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        return {
            position: positionBuffer,
        };
    };

    // 渲染场景
    const drawScene = (
        gl: WebGLRenderingContext,
        program: WebGLProgram,
        buffers: any
    ) => {
        // 设置清除颜色并清除
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // 设置顶点位置属性
        const vertexPosition = gl.getAttribLocation(program, "aVertexPosition");
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
        gl.vertexAttribPointer(vertexPosition, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vertexPosition);

        // 获取时间
        const now = Date.now();
        const elapsedTime = (now - startTimeRef.current) / 1000.0;

        // 设置uniform变量
        const timeLocation = gl.getUniformLocation(program, "time");
        gl.uniform1f(timeLocation, elapsedTime);

        const resolutionLocation = gl.getUniformLocation(program, "resolution");
        gl.uniform2f(resolutionLocation, gl.canvas.width, gl.canvas.height);

        // 使用着色器程序
        gl.useProgram(program);

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

            if (gl) {
                gl.viewport(0, 0, canvas.width, canvas.height);
            }
        };

        // 初始化WebGL
        const gl = initGL(canvasRef.current);
        if (!gl) return;

        // 编译着色器
        const vertexShader = compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
        const fragmentShader = compileShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);
        if (!vertexShader || !fragmentShader) return;

        // 创建程序
        const program = createProgram(gl, vertexShader, fragmentShader);
        if (!program) return;

        // 初始化缓冲区
        const buffers = initBuffers(gl);

        // 设置画布尺寸
        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);

        // 动画循环
        const animate = () => {
            drawScene(gl, program, buffers);
            requestRef.current = requestAnimationFrame(animate);
        };

        // 开始动画
        requestRef.current = requestAnimationFrame(animate);

        // 清理函数
        return () => {
            window.removeEventListener("resize", resizeCanvas);

            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }

            if (gl) {
                gl.deleteProgram(program);
                gl.deleteShader(vertexShader);
                gl.deleteShader(fragmentShader);
            }
        };
    }, []);

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

export default SimpleGLSLBackground;